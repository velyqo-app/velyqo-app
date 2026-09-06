import { supabase } from "../lib/supabase";
import { getCapabilityGaps } from "./capabilityGapService";
import { CapabilityGap, CapabilityImportance } from "../types/capability";

const IMPORTANCE_TIER: Record<CapabilityImportance, number> = {
  critical: 0,
  important: 1,
  helpful: 2,
};

interface Rankable {
  status: string;
  importance: CapabilityImportance;
}

/**
 * Computes each item's priority_rank: 1-based and contiguous among
 * status === "priority_gap" items only, in the same index order as the
 * input array; every other status gets null. Never touches AI-authored
 * fields (name/description/importance) or status itself — this is a pure
 * function of status + importance + input order.
 *
 * `Array.prototype.sort` is stable (guaranteed since ES2019, true on every
 * engine this project targets), so items that tie on importance tier keep
 * their relative order from the input array. That is what satisfies "within
 * the same importance tier, preserve the AI's original order" — the input
 * array's order IS treated as that original order, so it is the caller's
 * job to supply items in the right order. See applyPriorityRanking below
 * for the two cases (fresh generation vs. re-reading persisted rows) and
 * why they don't have equally strong claims to "original order".
 */
export function calculatePriorityRanks<T extends Rankable>(
  items: T[],
): (number | null)[] {
  const indexed = items.map((item, index) => ({ item, index }));

  const priorityItems = indexed.filter(
    ({ item }) => item.status === "priority_gap",
  );

  const sorted = [...priorityItems].sort(
    (a, b) => IMPORTANCE_TIER[a.item.importance] - IMPORTANCE_TIER[b.item.importance],
  );

  const ranks: (number | null)[] = new Array(items.length).fill(null);

  sorted.forEach(({ index }, rankIndex) => {
    ranks[index] = rankIndex + 1;
  });

  return ranks;
}

export type ApplyRankingResult =
  | { data: CapabilityGap[]; error: null }
  | { data: null; error: string };

/**
 * Deterministic fallback order for rows whose true generation order was not
 * supplied (see the `originalOrderCapabilityNames` parameter below):
 * (created_at, id). This is reproducible — repeat calls yield the same
 * order for unchanged data — but it is NOT always the true original AI
 * order. capabilityPersistenceService inserts a whole assessment as a
 * single multi-row INSERT, and Postgres's `now()` (used by the created_at
 * column default) is fixed for the entire statement, so every row from one
 * generation shares the exact same created_at. In that (normal) case the
 * `id` tie-break decides order instead, and a UUID does not reflect
 * generation order. This is a genuine, unavoidable limitation of
 * reconstructing order from already-persisted rows alone, given the schema
 * approved in Step 1 records no explicit ordinal column — flagged here
 * rather than worked around with a schema change, per the Step 5 scope.
 */
function fallbackOrder(rows: CapabilityGap[]): CapabilityGap[] {
  return [...rows].sort((a, b) => {
    if (a.created_at !== b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Whether this user's priority_gap rows already satisfy the ranking
 * invariant: 1-based, contiguous, no gaps, no nulls, no duplicates. Used as
 * applyPriorityRanking's early-exit gate — a pure, in-memory check over
 * rows already fetched by the caller (no extra read), so calling it costs
 * nothing beyond the read that would happen anyway.
 *
 * This subsumes the old "some priority_gap row has a null rank" check
 * (that condition is one way this can be false) and additionally repairs a
 * case that check alone couldn't detect: a row leaving priority_gap status
 * has its own rank nulled directly by capabilityStatusService, but if the
 * *reflow* of the remaining priority_gap rows that same operation triggers
 * ever fails (see that service's docs), those remaining rows keep valid,
 * non-null, but non-contiguous ranks (e.g. 2,3 instead of 1,2) — which
 * this check now catches on the very next read, self-healing it without
 * needing `options.force` explicitly (force remains available and is
 * harmless — it just restates what this check would already trigger).
 */
export function hasContiguousPriorityRanking(rows: CapabilityGap[]): boolean {
  const ranks = rows
    .filter((row) => row.status === "priority_gap")
    .map((row) => row.priority_rank);

  if (ranks.length === 0) {
    return true;
  }

  if (ranks.some((rank) => rank === null)) {
    return false;
  }

  const sorted = [...(ranks as number[])].sort((a, b) => a - b);

  return sorted.every((rank, index) => rank === index + 1);
}

/**
 * Reads a user's persisted assessment for a target role and brings
 * priority_rank on its rows in line with the deterministic rule in
 * calculatePriorityRanks. Never regenerates anything, makes no AI call, and
 * never changes capability_name, capability_description, importance,
 * status, evidence_summary or created_at — only priority_rank.
 *
 * Does nothing (no read-derived reordering, no write) once
 * hasContiguousPriorityRanking is already true for this data — an
 * assessment is generated and ranked as one unit and never partially
 * re-ranked in the normal case, so this is what keeps a plain revisit from
 * recomputing (and risking overwriting) ranks that are already correct.
 * When it is NOT true — including the self-healing case where a prior
 * reflow failed and left the remaining priority_gap rows non-contiguous
 * (see that check's own doc comment) — this automatically repairs it on
 * this call, since applyPriorityRanking is already invoked on every normal
 * read path (Home's Tier 0 lookup, the Career Gap screen's load/refresh).
 * The repair write only happens when something is actually wrong; an
 * already-valid ranking never writes, so this never becomes a
 * write-on-every-read.
 *
 * `options.force`, when true, always recomputes regardless of the check
 * above (still only writing rows whose rank actually changed) — kept for
 * capabilityStatusService's explicit post-status-change reflow call, where
 * it is now technically redundant with the self-healing check but harmless
 * to keep. Every existing caller omits `options`, so this remains fully
 * backward compatible.
 *
 * `originalOrderCapabilityNames`, when supplied, is used as the true
 * "AI's original order" (matched to persisted rows by capability_name,
 * which is unique per user+target_role by the Step 1 schema's constraint)
 * instead of the (created_at, id) fallback above. Pass this right after a
 * fresh generateCapabilities() + saveCapabilityAssessment() call, using
 * `generated.map(c => c.name)` — at that point the true order is still
 * available in memory and has not yet been flattened by persistence. Omit
 * it when simply loading an existing assessment on a revisit; that path
 * only ever runs the fallback ordering, and only when ranks are actually
 * missing, per the paragraph above.
 *
 * Writes only the priority_gap rows, as a single multi-row upsert keyed on
 * id — one PostgREST request, one SQL `INSERT ... ON CONFLICT (id) DO
 * UPDATE` statement, atomic as a whole. If it fails, nothing is written;
 * there is no partially updated ranking to worry about, and no per-row loop
 * of separate requests that could get partway through and stop.
 */
export async function applyPriorityRanking(
  userId: string,
  targetRole: string,
  originalOrderCapabilityNames?: string[],
  options?: { force?: boolean },
): Promise<ApplyRankingResult> {
  const { data: rows, error: readError } = await getCapabilityGaps(
    userId,
    targetRole,
  );

  if (readError || !rows) {
    return { data: null, error: readError?.message ?? "read_failed" };
  }

  if (rows.length === 0) {
    return { data: rows, error: null };
  }

  if (hasContiguousPriorityRanking(rows) && !options?.force) {
    return { data: rows, error: null };
  }

  let ordered: CapabilityGap[];

  if (originalOrderCapabilityNames) {
    const byName = new Map(rows.map((row) => [row.capability_name, row]));

    const named = originalOrderCapabilityNames
      .map((name) => byName.get(name))
      .filter((row): row is CapabilityGap => row !== undefined);

    const namedIds = new Set(named.map((row) => row.id));
    const leftover = fallbackOrder(rows.filter((row) => !namedIds.has(row.id)));

    ordered = [...named, ...leftover];
  } else {
    ordered = fallbackOrder(rows);
  }

  const ranks = calculatePriorityRanks(ordered);

  const changed = ordered
    .map((row, index) => ({ row, rank: ranks[index] }))
    .filter(({ row }) => row.status === "priority_gap")
    .filter(({ row, rank }) => row.priority_rank !== rank)
    .map(({ row, rank }) => ({ ...row, priority_rank: rank }));

  if (changed.length === 0) {
    return { data: rows, error: null };
  }

  const { data: updated, error: writeError } = await supabase
    .from("capability_gaps")
    .upsert(changed, { onConflict: "id" })
    .select()
    .returns<CapabilityGap[]>();

  if (writeError || !updated) {
    return { data: null, error: writeError?.message ?? "update_failed" };
  }

  const updatedById = new Map(updated.map((row) => [row.id, row]));

  const merged = rows.map((row) => updatedById.get(row.id) ?? row);

  return { data: merged, error: null };
}

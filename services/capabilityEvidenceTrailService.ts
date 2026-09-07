import { getProfile } from "./profileService";
import { getAllCapabilityGapsForUser } from "./capabilityGapService";
import { getAllCapabilityEvidenceForUser } from "./capabilityEvidenceService";
import { getJournal } from "./journalService";
import { CapabilityEvidence, CapabilityGap } from "../types/capability";
import {
  CapabilityEvidenceTrail,
  CapabilityEvidenceTrailItem,
  CapabilityEvidenceTrailsResult,
  CapabilityEvidenceTrailsSection,
} from "../types/capabilityEvidenceTrail";
import { JourneyEventProvenance } from "../types/careerJourney";
import { JournalEntry } from "../types/journal";

/**
 * Phase 11 Step 3 — Capability Evidence Trail assembly.
 *
 * Read-only, deterministic per-capability reconstruction of "why does
 * VELYQO assess this capability this way" — a sibling to
 * careerJourneyService.ts, not an extension of it (see that file's own
 * header comment for why the two stay separate). No write, no AI call, no
 * new persisted entity, no second capability-status system: currentStatus
 * is always copied directly from capability_gaps.status. Never touches
 * CareerState or NextMove, both of which remain entirely unaware this file
 * exists.
 */

const MISSION_COMPLETION_SOURCE = "mission_completion";

function provenanceFor(sourceType: string): JourneyEventProvenance {
  return sourceType === MISSION_COMPLETION_SOURCE
    ? "velyqo_verified"
    : "you_reported";
}

function buildTrailItem(
  evidence: CapabilityEvidence,
  journalById: Map<string, JournalEntry>,
): CapabilityEvidenceTrailItem {
  const sourceReference = evidence.journal_entry_id
    ? journalById.get(evidence.journal_entry_id)?.title ?? null
    : null;

  return {
    id: evidence.id,
    date: evidence.created_at,
    provenance: provenanceFor(evidence.source_type),
    note: evidence.note ?? "",
    sourceReference,
  };
}

/** Oldest-first, with a stable tie-break on id so equal-timestamp rows
 * always come back in the same order across calls. */
function compareEvidenceOldestFirst(
  a: CapabilityEvidenceTrailItem,
  b: CapabilityEvidenceTrailItem,
): number {
  const byDate = a.date.localeCompare(b.date);

  return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
}

function latestActivityDate(
  trail: CapabilityEvidenceTrail,
  gap: CapabilityGap,
): string {
  if (trail.evidence.length === 0) {
    return gap.created_at;
  }

  // Evidence is already sorted oldest-first by the time this runs, so the
  // last element is the newest.
  return trail.evidence[trail.evidence.length - 1].date;
}

/** Most-recent-activity first, with a stable tie-break on capabilityGapId
 * so equal-timestamp trails always come back in the same order. */
function compareTrailsByRecency(
  gapsById: Map<string, CapabilityGap>,
): (a: CapabilityEvidenceTrail, b: CapabilityEvidenceTrail) => number {
  return (a, b) => {
    const aGap = gapsById.get(a.capabilityGapId);
    const bGap = gapsById.get(b.capabilityGapId);

    // Not reachable in practice — every trail is built from a gap already
    // present in gapsById — but satisfied honestly rather than asserted
    // away with a non-null assertion.
    const aDate = aGap ? latestActivityDate(a, aGap) : "";
    const bDate = bGap ? latestActivityDate(b, bGap) : "";

    const byDate = bDate.localeCompare(aDate);

    return byDate !== 0 ? byDate : a.capabilityGapId.localeCompare(b.capabilityGapId);
  };
}

/**
 * Pure classification/grouping/ordering — given the four sources already
 * fetched, returns the fully assembled trail list: current-target-role
 * capabilities first, then historical, each group ordered by most-recent
 * activity; each trail's own evidence ordered oldest-first. No I/O,
 * deterministic. Exported for direct unit testing, mirroring
 * careerJourneyService.assembleJourneyEvents's own pure/impure split.
 *
 * `currentTargetRole` is null both when the user genuinely has none yet
 * (honest — no profile, or an empty target_role) and when the profile
 * read failed (the caller cannot tell this function which case it is, and
 * this function doesn't need to: either way, no capability can honestly
 * be called "current" without a real target role to compare against, so
 * every trail's isCurrentTargetRole is false in both cases alike).
 */
export function assembleCapabilityEvidenceTrails(
  currentTargetRole: string | null,
  capabilityGaps: CapabilityGap[],
  evidence: CapabilityEvidence[],
  journal: JournalEntry[],
): CapabilityEvidenceTrail[] {
  const journalById = new Map(journal.map((row) => [row.id, row]));

  const evidenceByCapabilityGapId = new Map<string, CapabilityEvidence[]>();

  for (const row of evidence) {
    const bucket = evidenceByCapabilityGapId.get(row.capability_gap_id);

    if (bucket) {
      bucket.push(row);
    } else {
      evidenceByCapabilityGapId.set(row.capability_gap_id, [row]);
    }
  }

  const normalizedCurrentTargetRole = currentTargetRole?.trim() ?? null;

  const trails: CapabilityEvidenceTrail[] = capabilityGaps.map((gap) => {
    const gapEvidence = (evidenceByCapabilityGapId.get(gap.id) ?? [])
      .map((row) => buildTrailItem(row, journalById))
      .sort(compareEvidenceOldestFirst);

    return {
      capabilityGapId: gap.id,
      capabilityName: gap.capability_name,
      targetRole: gap.target_role,
      isCurrentTargetRole:
        normalizedCurrentTargetRole !== null &&
        gap.target_role.trim() === normalizedCurrentTargetRole,
      currentStatus: gap.status,
      evidence: gapEvidence,
    };
  });

  // Evidence rows whose capability_gap_id matches no fetched gap are never
  // visited above (this loop iterates GAPS, not evidence) — silently
  // excluded by construction, never fabricated into a phantom trail.

  const gapsById = new Map(capabilityGaps.map((gap) => [gap.id, gap]));
  const byRecency = compareTrailsByRecency(gapsById);

  const current = trails.filter((trail) => trail.isCurrentTargetRole).sort(byRecency);
  const historical = trails.filter((trail) => !trail.isCurrentTargetRole).sort(byRecency);

  return [...current, ...historical];
}

/**
 * Assembles VELYQO's full per-capability evidence reconstruction for one
 * user.
 *
 * `capability_gaps` is essential — a genuine read failure fails the whole
 * call, since there is nothing honest to group evidence by without it.
 * `profile`, `capability_evidence`, and `journal` are enrichment-only: a
 * failure on any of them degrades gracefully (isCurrentTargetRole
 * defaults to false; evidence defaults to empty; sourceReference defaults
 * to null) rather than failing the whole assembly —
 * `partial`/`unavailableSections` report exactly which section(s) were
 * unavailable.
 *
 * A profile that simply doesn't exist yet (pre-onboarding) is NOT a
 * failure — getProfile's own `.maybeSingle()` convention already
 * distinguishes "no row" (data: null, error: null) from a genuine read
 * error, and only the latter is treated as unavailable here.
 *
 * Fetches all four sources in parallel via the existing, unmodified
 * service layer (getProfile, getAllCapabilityGapsForUser,
 * getAllCapabilityEvidenceForUser, getJournal) — no direct Supabase query
 * lives in this file, and no existing service function is modified.
 */
export async function getCapabilityEvidenceTrails(
  userId: string,
): Promise<CapabilityEvidenceTrailsResult> {
  const [profileResult, gapsResult, evidenceResult, journalResult] =
    await Promise.all([
      getProfile(userId),
      getAllCapabilityGapsForUser(userId),
      getAllCapabilityEvidenceForUser(userId),
      getJournal(userId),
    ]);

  if (gapsResult.error || !gapsResult.data) {
    console.warn(
      "CapabilityEvidenceTrails: capability gaps read failed:",
      gapsResult.error?.message,
    );

    return {
      data: null,
      error: "We couldn't load your capability evidence. Please try again.",
    };
  }

  const unavailableSections: CapabilityEvidenceTrailsSection[] = [];

  if (profileResult.error) {
    console.warn(
      "CapabilityEvidenceTrails: profile read failed:",
      profileResult.error.message,
    );
    unavailableSections.push("profile");
  }

  if (evidenceResult.error || !evidenceResult.data) {
    console.warn(
      "CapabilityEvidenceTrails: capability evidence read failed:",
      evidenceResult.error,
    );
    unavailableSections.push("capability_evidence");
  }

  if (journalResult.error || !journalResult.data) {
    console.warn(
      "CapabilityEvidenceTrails: journal read failed:",
      journalResult.error?.message,
    );
    unavailableSections.push("journal");
  }

  const currentTargetRole = profileResult.data?.target_role ?? null;
  const evidence = evidenceResult.data ?? [];
  // getJournal does not apply .returns<JournalEntry[]>() itself — annotated
  // explicitly here rather than widening this file's own typing to `any`.
  const journal = (journalResult.data ?? []) as JournalEntry[];

  const trails = assembleCapabilityEvidenceTrails(
    currentTargetRole,
    gapsResult.data,
    evidence,
    journal,
  );

  return {
    data: {
      trails,
      partial: unavailableSections.length > 0,
      unavailableSections,
    },
    error: null,
  };
}

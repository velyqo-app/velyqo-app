import {
  getMissionCompletionEvidence,
  getProfileSnapshotEvidence,
} from "./capabilityEvidenceService";
import { applyPriorityRanking } from "./capabilityPriorityService";
import { supabase } from "../lib/supabase";
import { CapabilityGap, CapabilityStatus } from "../types/capability";

/**
 * Deterministic status from qualifying mission-completion evidence count —
 * pure, no I/O. Protected against downgrading whatever status is already
 * persisted:
 *
 * - Already "strength" stays "strength" regardless of count (evidence only
 *   ever adds up, it never un-happens).
 * - 2+ qualifying events -> "strength".
 * - Exactly 1 -> "developing".
 * - 0 -> the current status, unchanged. This is deliberately the same
 *   whether the 0 is genuine (no evidence yet) or a symptom of the caller
 *   mapping a failed/empty read to 0 — either way, mission evidence must
 *   only ever upgrade, never reset or downgrade a capability that already
 *   has real evidence behind it (e.g. "developing" must never fall back to
 *   "priority_gap" just because a recalculation's read failed).
 *
 * Never reinterprets the AI's importance label and never touches
 * initial-status logic (Step 4's determineInitialStatus) — this only ever
 * runs on an already-persisted row, after evidence exists.
 */
export function computeStatusFromEvidence(
  currentStatus: CapabilityStatus,
  qualifyingEvidenceCount: number,
): CapabilityStatus {
  if (currentStatus === "strength") {
    return "strength";
  }

  if (qualifyingEvidenceCount >= 2) {
    return "strength";
  }

  if (qualifyingEvidenceCount === 1) {
    return "developing";
  }

  return currentStatus;
}

/**
 * Phase 10.2 — self-reported (Career Check-in) evidence's own escalation
 * rule, applied as a second, independent step after computeStatusFromEvidence
 * above (see recalculateCapabilityStatus). Deliberately lower-ceilinged than
 * that function:
 *
 * - Already "strength" OR "developing" is returned unchanged — this evidence
 *   kind can never move a capability any further, and this is also exactly
 *   what makes "strength" structurally unreachable from here: a capability
 *   can only still be below "developing" when this function's own count
 *   check runs, and that check's own ceiling is "developing" itself.
 * - 2+ qualifying (post-activation, see getProfileSnapshotEvidence) events
 *   -> "developing".
 * - 0 or 1 -> the current status, unchanged.
 *
 * Composed with computeStatusFromEvidence, this guarantees self-reported
 * evidence can never independently or jointly produce "strength" — the only
 * path to "strength" remains computeStatusFromEvidence's own, unchanged,
 * mission-evidence-only threshold (Phase 10.2 Step 1, approved).
 */
export function computeStatusFromProfileSnapshotEvidence(
  currentStatus: CapabilityStatus,
  qualifyingProfileSnapshotCount: number,
): CapabilityStatus {
  if (currentStatus === "strength" || currentStatus === "developing") {
    return currentStatus;
  }

  if (qualifyingProfileSnapshotCount >= 2) {
    return "developing";
  }

  return currentStatus;
}

export type RecalculateStatusResult =
  | { statusChanged: false; error: null }
  | { statusChanged: true; newStatus: CapabilityStatus; error: null }
  | { statusChanged: false; error: string };

/**
 * Recalculates and persists ONE capability's status from ALL currently-
 * available evidence, then — only if that changes its status away from
 * "priority_gap" — reflows the user's remaining priority_gap ranks back to
 * contiguous via capabilityPriorityService (Step 5, reused unmodified in
 * logic; only its early-exit gate gained an opt-in `force` bypass — see
 * that file).
 *
 * Mission-completion evidence is read and applied first, via
 * computeStatusFromEvidence — entirely unchanged from before Phase 10.2. A
 * failure reading it aborts the whole recalculation exactly as it always
 * has, so existing mission-evidence behaviour (including its own failure
 * mode) is preserved exactly.
 *
 * Self-reported (profile_snapshot) evidence is then applied as a second,
 * independent step via computeStatusFromProfileSnapshotEvidence. A failure
 * reading THAT is deliberately non-fatal: logged, and treated as zero
 * qualifying events for this call only, so a profile_snapshot-side read
 * problem can never block or change a purely mission-driven status result —
 * it simply self-heals on the next successful recalculation, the same
 * self-healing precedent this function already relies on for the priority
 * reflow warning below.
 *
 * Writes nothing if the computed status equals the row's current status —
 * a no-op recalculation never touches updated_at and never triggers a
 * priority reflow. `capabilityGap` is the caller's already-fetched row
 * (avoids a redundant read); this function trusts it belongs to `userId`
 * and is current as of the caller's read — callers that need an ownership
 * check should do it (e.g. via getCapabilityGapById) before calling this.
 */
export async function recalculateCapabilityStatus(
  userId: string,
  capabilityGap: CapabilityGap,
): Promise<RecalculateStatusResult> {
  const { data: missionEvidence, error: missionEvidenceError } =
    await getMissionCompletionEvidence(userId, capabilityGap.id);

  if (missionEvidenceError || !missionEvidence) {
    return {
      statusChanged: false,
      error: missionEvidenceError?.message ?? "evidence_read_failed",
    };
  }

  const afterMissionEvidence = computeStatusFromEvidence(
    capabilityGap.status,
    missionEvidence.length,
  );

  const { data: profileSnapshotEvidence, error: profileSnapshotEvidenceError } =
    await getProfileSnapshotEvidence(userId, capabilityGap.id);

  if (profileSnapshotEvidenceError) {
    console.warn(
      "Capability status recalculation: profile_snapshot evidence read failed, proceeding with mission evidence only:",
      profileSnapshotEvidenceError.message,
    );
  }

  const qualifyingProfileSnapshotCount = profileSnapshotEvidence?.length ?? 0;

  const newStatus = computeStatusFromProfileSnapshotEvidence(
    afterMissionEvidence,
    qualifyingProfileSnapshotCount,
  );

  if (newStatus === capabilityGap.status) {
    return { statusChanged: false, error: null };
  }

  const wasLeavingPriorityGap = capabilityGap.status === "priority_gap";

  const nextPriorityRank =
    newStatus === "developing" || newStatus === "strength"
      ? null
      : capabilityGap.priority_rank;

  const { error: updateError } = await supabase
    .from("capability_gaps")
    .update({ status: newStatus, priority_rank: nextPriorityRank })
    .eq("id", capabilityGap.id)
    .eq("user_id", userId);

  if (updateError) {
    return { statusChanged: false, error: updateError.message };
  }

  if (wasLeavingPriorityGap) {
    // The row that just left priority_gap already had its own rank nulled
    // above; the remaining priority_gap rows still hold their old, now
    // non-contiguous, ranks. force:true is required here specifically
    // because none of THEM have a null rank, so applyPriorityRanking's
    // normal early-exit would otherwise skip reflowing them.
    const rerank = await applyPriorityRanking(
      userId,
      capabilityGap.target_role,
      undefined,
      { force: true },
    );

    if (rerank.error !== null) {
      // Not treated as this function's own failure — the status change
      // above already succeeded and is the source of truth. Left
      // unresolved here: the remaining priority_gap rows keep valid,
      // non-null, but non-contiguous ranks (never invalid data, never a
      // crash) until this user's NEXT status-changing evidence event
      // triggers another force:true reflow — a routine, non-forced
      // applyPriorityRanking read (e.g. Home's Tier 0 lookup) will not
      // retry this on its own, since its early-exit only fires on a null
      // rank, which none of these rows have. Logged here rather than
      // silently lost; see the Step 7 report.
      console.warn(
        "Priority reflow after status change failed:",
        rerank.error,
      );
    }
  }

  return { statusChanged: true, newStatus, error: null };
}

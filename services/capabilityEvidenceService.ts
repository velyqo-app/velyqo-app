import { supabase } from "../lib/supabase";
import { CapabilityEvidence } from "../types/capability";

const MISSION_COMPLETION_SOURCE = "mission_completion";
const MISSION_COMPLETION_STRENGTH = "supports_developing";

const PROFILE_SNAPSHOT_SOURCE = "profile_snapshot";
const PROFILE_SNAPSHOT_STRENGTH = "supports_developing";

/**
 * All mission-completion evidence rows for a capability, scoped to the
 * owning user (defense in depth on top of RLS). "Qualifying" per the Step 7
 * status rule means source_type === "mission_completion" specifically —
 * profile_snapshot evidence (not created by any current code path) never
 * counts toward the mission-evidence escalation rule, so this deliberately
 * filters to it rather than returning every evidence row for the gap.
 */
export async function getMissionCompletionEvidence(
  userId: string,
  capabilityGapId: string,
) {
  return await supabase
    .from("capability_evidence")
    .select("*")
    .eq("user_id", userId)
    .eq("capability_gap_id", capabilityGapId)
    .eq("source_type", MISSION_COMPLETION_SOURCE)
    .returns<CapabilityEvidence[]>();
}

/**
 * Phase 10.2 activation cutoff — the exact, hard-coded instant self-reported
 * (Career Check-in) evidence became eligible to affect capability status.
 *
 * "No retroactive backfill" (Phase 10.2 Step 1, approved) means literally
 * this: any profile_snapshot row created before this instant — including
 * every one created during Step 7/7.1/8 testing and any real usage before
 * Phase 10.2 shipped — is PERMANENTLY excluded from
 * getProfileSnapshotEvidence's result, for the life of this constant. It is
 * a fixed point in time, not "now" and not an install timestamp — it must
 * NEVER be replaced with a dynamic Date computation, and must not be edited
 * casually: changing it changes what "no backfill" means for every existing
 * row already in the database.
 *
 * Exported (Phase 13) so capabilityAchievementService's milestone
 * reconstruction can apply the exact same cutoff to profile_snapshot
 * evidence it replays — never a second, hand-copied literal.
 */
export const PHASE_10_2_ACTIVATION_CUTOFF = "2026-09-07T00:00:00.000Z";

/**
 * All post-activation profile_snapshot evidence rows for a capability,
 * scoped to the owning user — mirrors getMissionCompletionEvidence's exact
 * shape, with one addition: rows created before PHASE_10_2_ACTIVATION_CUTOFF
 * are excluded, per the approved no-backfill decision above. Evidence rows
 * before the cutoff are never deleted or altered — they are simply outside
 * what this read (and therefore computeStatusFromProfileSnapshotEvidence)
 * ever counts.
 */
export async function getProfileSnapshotEvidence(
  userId: string,
  capabilityGapId: string,
) {
  return await supabase
    .from("capability_evidence")
    .select("*")
    .eq("user_id", userId)
    .eq("capability_gap_id", capabilityGapId)
    .eq("source_type", PROFILE_SNAPSHOT_SOURCE)
    .gte("created_at", PHASE_10_2_ACTIVATION_CUTOFF)
    .returns<CapabilityEvidence[]>();
}

/**
 * Phase 11 Step 3 — every capability_evidence row for a user, across every
 * capability and every source_type, unscoped by capability_gap_id and
 * WITHOUT the PHASE_10_2_ACTIVATION_CUTOFF filter that getProfileSnapshotEvidence
 * applies. Deliberately different from that function: the cutoff is a
 * STATUS-THRESHOLD concept (which evidence counts toward escalating a
 * capability's status), not a "this evidence doesn't exist" concept — a
 * pre-cutoff row is a completely real, permanent historical fact, and
 * Journey Assembly (which only reads this to enrich a mission's journal
 * entry with its capability name, never to recompute status) has no reason
 * to exclude it. See the Phase 10.2 Step 4 discovery report for this exact
 * distinction.
 *
 * Read-only. Returns `data: []` (not null) when the user has no evidence at
 * all.
 */
export async function getAllCapabilityEvidenceForUser(userId: string) {
  return await supabase
    .from("capability_evidence")
    .select("*")
    .eq("user_id", userId)
    .returns<CapabilityEvidence[]>();
}

export type RecordEvidenceResult =
  | { data: CapabilityEvidence; created: true; error: null }
  // Not an error — evidence for this exact journal entry already existed,
  // so nothing new was inserted. See the doc comment below.
  | { data: CapabilityEvidence; created: false; error: null }
  | { data: null; created: false; error: string };

/**
 * Records ONE mission-completion evidence event for a capability — or, if
 * evidence already exists for this exact journalEntryId, does nothing and
 * returns the existing row instead of inserting a duplicate.
 *
 * That journal_entry_id check is this function's idempotency guard, and
 * its guarantee is exactly as strong as journal_entry_id's real-world
 * uniqueness: a genuinely new mission completion always produces a fresh
 * journal row (journalService.createJournalEntry inserts a new row every
 * call, by design — Step 7 does not change that), so re-invoking this
 * function for the SAME journal_entry_id only happens when something
 * re-runs the SAME completion attempt (e.g. an accidental double-invoke of
 * one mission-complete mount) — a genuine no-op here, not a duplicate row.
 * It does NOT protect against a user explicitly retrying after a failure,
 * which creates a brand new journal entry and is therefore, by
 * construction of the existing schema, indistinguishable from a genuinely
 * new completion — see the Step 7 report for why this is a disclosed
 * limitation rather than something this function invents a fix for.
 *
 * This is a sequential check-then-insert, not one atomic statement — a
 * narrow race exists if this were ever called truly concurrently for the
 * same journal_entry_id (both calls could see "no existing row" before
 * either commits). The existing schema has no unique constraint that would
 * close this, and Step 7 does not add one; also disclosed in the report.
 *
 * Never invents what the user accomplished — `note` only states that the
 * VELYQO mission itself was completed.
 */
export async function recordMissionCompletionEvidence(
  userId: string,
  capabilityGapId: string,
  journalEntryId: string | null,
  capabilityName: string,
): Promise<RecordEvidenceResult> {
  if (journalEntryId) {
    const { data: existing, error: existingError } = await supabase
      .from("capability_evidence")
      .select("*")
      .eq("user_id", userId)
      .eq("capability_gap_id", capabilityGapId)
      .eq("journal_entry_id", journalEntryId)
      .returns<CapabilityEvidence[]>();

    if (existingError) {
      return { data: null, created: false, error: existingError.message };
    }

    if (existing && existing.length > 0) {
      return { data: existing[0], created: false, error: null };
    }
  }

  const { data, error } = await supabase
    .from("capability_evidence")
    .insert({
      user_id: userId,
      capability_gap_id: capabilityGapId,
      journal_entry_id: journalEntryId,
      source_type: MISSION_COMPLETION_SOURCE,
      strength: MISSION_COMPLETION_STRENGTH,
      note: `Completed the VELYQO capability mission for ${capabilityName}.`,
    })
    .select()
    .returns<CapabilityEvidence[]>()
    .single();

  if (error || !data) {
    return {
      data: null,
      created: false,
      error: error?.message ?? "insert_failed",
    };
  }

  return { data, created: true, error: null };
}

export type RecordProfileSnapshotEvidenceResult =
  | { data: CapabilityEvidence; error: null }
  | { data: null; error: string };

/**
 * Phase 10.1 Step 7 — records ONE self-reported (Career Check-in) evidence
 * event against an existing capability_gaps row. Always source_type
 * "profile_snapshot", always strength "supports_developing" — self-
 * reported evidence is never written at "supports_strength" directly.
 *
 * Phase 10.2: a row written here now CAN affect capability status — see
 * getProfileSnapshotEvidence and capabilityStatusService's
 * computeStatusFromProfileSnapshotEvidence/recalculateCapabilityStatus —
 * but only once it is at or after PHASE_10_2_ACTIVATION_CUTOFF (this
 * function does not check that cutoff itself; it is applied entirely on
 * the read side), and even then it can only ever escalate a capability to
 * "developing", never to "strength" (see that function's own doc comment
 * for why "strength" is structurally unreachable from this evidence kind).
 *
 * No journal_entry_id — self-reported evidence has no mission-completion
 * journal entry to link back to. The Career Check-in's own journal entry
 * is tracked separately, on career_checkin_confirmations.journal_entry_id,
 * not here.
 *
 * Unlike recordMissionCompletionEvidence, this performs NO existing-row
 * check before inserting — idempotency for Career Check-in evidence is
 * the CALLER's responsibility (careerCheckinConfirmationService only
 * invokes this once per decision whose applyStatus is not already
 * "applied"); a duplicate insert on a genuinely tampered retry is an
 * accepted, disclosed, self-contained limitation (Step 7 design report
 * §2/§9), not something this function guards against.
 *
 * `capabilityGapId` ownership must already be verified by the caller
 * before this is invoked (the confirmation-input validation boundary,
 * Step 7 §3) — this function trusts it belongs to `userId` and does not
 * re-check it, matching recordMissionCompletionEvidence's own trust of an
 * already-verified capabilityGapId.
 */
export async function recordProfileSnapshotEvidence(
  userId: string,
  capabilityGapId: string,
  note: string,
): Promise<RecordProfileSnapshotEvidenceResult> {
  const { data, error } = await supabase
    .from("capability_evidence")
    .insert({
      user_id: userId,
      capability_gap_id: capabilityGapId,
      source_type: PROFILE_SNAPSHOT_SOURCE,
      strength: PROFILE_SNAPSHOT_STRENGTH,
      note,
    })
    .select()
    .returns<CapabilityEvidence[]>()
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "insert_failed" };
  }

  return { data, error: null };
}

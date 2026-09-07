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
 * Per this file's own getMissionCompletionEvidence, used by
 * capabilityStatusService.recalculateCapabilityStatus, filtering strictly
 * on `source_type === "mission_completion"`, this evidence is
 * structurally invisible to status recalculation: writing this row can
 * never move a capability toward "developing"/"strength" under the
 * current status system, by construction of code this function does not
 * touch. (Whether profile_snapshot evidence should ever count toward
 * status is a separate, future, explicit product decision — this function
 * does not make that decision, and today's status logic does not either.)
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

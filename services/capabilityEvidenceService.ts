import { supabase } from "../lib/supabase";
import { CapabilityEvidence } from "../types/capability";

const MISSION_COMPLETION_SOURCE = "mission_completion";
const MISSION_COMPLETION_STRENGTH = "supports_developing";

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

import { supabase } from "../lib/supabase";
import { CareerCheckin, CareerCheckinInput } from "../types/careerCheckin";

export type CreateCareerCheckinResult =
  | { data: CareerCheckin; error: null }
  | { data: null; error: string };

/**
 * A single career_checkins row by id, scoped to the given user — added in
 * Phase 10.1 Step 7 as the read the confirmation/orchestration layer needs
 * (deferred in Step 4: "no read function... until a real consumer
 * exists"). Mirrors capabilityGapService.getCapabilityGapById exactly:
 * `.maybeSingle()`, scoped by both `id` and `user_id` so "doesn't exist"
 * and "exists but belongs to a different user" are indistinguishable from
 * here — RLS already makes those two cases identical, and every caller
 * that needs this (careerCheckinConfirmationService's validation
 * boundary, in particular) should treat both cases the same way: refuse
 * to proceed. Read-only, like every other read in this file.
 */
export async function getCareerCheckinById(userId: string, checkinId: string) {
  return await supabase
    .from("career_checkins")
    .select("*")
    .eq("id", checkinId)
    .eq("user_id", userId)
    .returns<CareerCheckin[]>()
    .maybeSingle();
}

/**
 * Persists one completed Career Check-in — and does exactly that, nothing
 * else. Mirrors capabilityPersistenceService.saveCapabilityAssessment's
 * own precedent: a single, narrow persistence function, not an
 * orchestrator. It does not update profiles, does not create capability
 * evidence, does not create a career_journal entry, does not regenerate
 * capability gaps or a roadmap, does not touch Career State or the Next
 * Move Engine, and never calls AI. `input.reports` is persisted exactly
 * as given — this function never reads into an individual report's
 * content (proposedCurrentRole, proposedTargetRole, skillName, etc.) to
 * act on it. All of that belongs to a later orchestration step, which is
 * expected to call this function first, then separately call the
 * existing, unmodified services (profileService.updateProfile, a future
 * "profile_snapshot"-tagged evidence write, journalService
 * .createJournalEntry) for whatever the user actually confirms — the same
 * multi-service-call shape mission-complete.tsx's own orchestration
 * already uses for mission completion.
 *
 * `userId` is an explicit parameter, matching every existing write
 * service in this codebase (saveCapabilityAssessment,
 * recordMissionCompletionEvidence, createJournalEntry, completeMission) —
 * none of them resolve the caller's identity internally. The safe pattern
 * is the CALLER's responsibility: resolve `user.id` via
 * authService.getCurrentUser() (the actual authenticated session), never
 * from a route param, form field, or other UI-controlled value, then pass
 * it in here. RLS (`with check (auth.uid() = user_id)` on
 * career_checkins) is the actual enforcement boundary regardless of what
 * a caller supplies — a mismatched userId fails the insert outright
 * rather than writing to the wrong row.
 *
 * Validates only what this function itself must not trust blindly before
 * spending a write: `reports` must be a non-empty array. This is a
 * defensive minimum, not new business rule invention — "no_change" is
 * already how the approved contract (types/careerCheckin.ts) represents
 * "nothing changed" as an explicit report, so a check-in must contain at
 * least that one report to be a completed check-in at all. Nothing about
 * an individual report's shape is re-validated here; that is fully owned
 * by the TypeScript contract (compile-time) and the database's own
 * `jsonb_typeof(reports) = 'array'` check (Step 3) — this function does
 * not duplicate either.
 *
 * Never returns a raw Postgrest/Supabase error to the caller — logged via
 * console.warn only, matching every other service's established
 * convention.
 */
export async function createCareerCheckin(
  userId: string,
  input: CareerCheckinInput,
): Promise<CreateCareerCheckinResult> {
  if (!Array.isArray(input.reports) || input.reports.length === 0) {
    return {
      data: null,
      error: "Add at least one thing that changed before saving your check-in.",
    };
  }

  const { data, error } = await supabase
    .from("career_checkins")
    .insert({ user_id: userId, reports: input.reports })
    .select()
    .returns<CareerCheckin[]>()
    .single();

  if (error || !data) {
    console.warn("CareerCheckin: insert failed:", error?.message);

    return {
      data: null,
      error: "We couldn't save your check-in. Please try again.",
    };
  }

  return { data, error: null };
}

import { supabase } from "../lib/supabase";

/**
 * Uses maybeSingle so a user who has not finished onboarding yet resolves to
 * `data: null` instead of throwing PGRST116, which callers can render as an
 * empty state.
 */
export const getProfile = async (userId: string) => {
  return await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
};

export const updateProfile = async (
  userId: string,
  updates: Record<string, any>,
) => {
  return await supabase.from("profiles").update(updates).eq("user_id", userId);
};

export const createProfile = async (profile: Record<string, any>) => {
  return await supabase.from("profiles").insert(profile);
};

/**
 * Phase 11 Step 1 — pure, testable wording for the career_journal
 * ("profile_edit") entry a successful direct Profile edit produces.
 * Deliberately not "the journal service" itself (still journalService.ts /
 * createJournalEntry, unmodified) — these live here because they're
 * Profile-specific description text, not generic journal I/O.
 *
 * Never claims a "from" value that didn't exist: an empty old value (the
 * app's existing "not answered" convention) uses an honest "set" phrasing
 * instead of fabricating a prior state.
 */
export function buildRoleChangeJournalDescription(
  field: "currentRole" | "targetRole",
  oldValue: string,
  newValue: string,
): string {
  const trimmedOld = oldValue.trim();

  if (!trimmedOld) {
    return field === "currentRole"
      ? `Set current role to "${newValue}".`
      : `Set target role to "${newValue}".`;
  }

  return field === "currentRole"
    ? `Updated current role from "${trimmedOld}" to "${newValue}".`
    : `Changed target role from "${trimmedOld}" to "${newValue}".`;
}

export function buildSkillAddedJournalDescription(skill: string): string {
  return `Added skill: "${skill}".`;
}

/**
 * Which skills in a saved skills array are genuinely new relative to what
 * was previously persisted — used so a whole-array-replace save (the
 * existing Skills editor's actual behavior; see profile.tsx's saveSkills)
 * only journals the real additions, never the unchanged skills carried
 * along in the same save, and never a removal (no wording exists for that
 * in this step's approved scope).
 */
export function computeAddedSkills(
  originalSkills: string[],
  newSkills: string[],
): string[] {
  return newSkills.filter((skill) => !originalSkills.includes(skill));
}

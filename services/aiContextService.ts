import { AIContext } from "../types/ai";
import { JournalEntry } from "../types/journal";
import { Profile } from "../types/profile";
import { Progress } from "../types/progress";
import { getCurrentUser } from "./authService";
import { getTodaysMission } from "./careerMissionService";
import { getJournal } from "./journalService";
import { getMomentum } from "./momentumService";
import { getProfile } from "./profileService";
import { getProgress } from "./progressService";

export async function getAIContext(): Promise<AIContext | null> {
  const {
    data: { user },
  } = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: progress }, { data: journal }] =
    await Promise.all([
      getProfile(user.id),
      getProgress(user.id),
      getJournal(user.id),
    ]);

  // Without a profile there is no career context to coach against, and the
  // caller falls back to a generic greeting.
  if (!profile) {
    return null;
  }

  // A brand-new user has no progress row until they complete their first
  // mission. Coach against a zeroed baseline rather than refusing to answer,
  // which is what returning null here used to cause.
  const resolvedProgress: Progress = (progress as Progress | null) ?? {
    user_id: user.id,
    missions_completed: 0,
    current_streak: 0,
    career_readiness: 0,
    last_completed: null,
  };

  const resolvedProfile = profile as Profile;

  return {
    profile: resolvedProfile,

    progress: resolvedProgress,

    mission: getTodaysMission(resolvedProfile.target_role ?? ""),

    momentum: getMomentum(resolvedProgress.current_streak),

    journal: (journal ?? []) as JournalEntry[],
  };
}

import { getCurrentUser } from "./authService";
import { getTodaysMission } from "./careerMissionService";
import { getJournal } from "./journalService";
import { getMomentum } from "./momentumService";
import { getProfile } from "./profileService";
import { getProgress } from "./progressService";

export async function getAIContext() {
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

  console.log("PROFILE FROM SUPABASE:", profile);

  if (!profile || !progress) {
    return null;
  }

  const targetRole =
    profile.targetRole ??
    profile.target_role ??
    "";

  const mission = getTodaysMission(targetRole);

  const momentum = getMomentum(progress.current_streak);

  return {
    profile,
    progress,
    mission,
    momentum,
    journal: journal ?? [],
  };
}
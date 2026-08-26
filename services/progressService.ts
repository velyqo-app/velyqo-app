import { supabase } from "../lib/supabase";

/**
 * Uses maybeSingle so a user with no progress row yet resolves to `data: null`
 * instead of throwing PGRST116.
 */
export async function getProgress(userId: string) {
  return await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function createProgress(userId: string) {
  return await supabase.from("user_progress").insert({
    user_id: userId,
  });
}

export async function completeMission(userId: string) {
  const { data, error } = await getProgress(userId);

  if (error || !data) {
    return await createProgress(userId);
  }

  return await supabase
    .from("user_progress")
    .update({
      missions_completed: data.missions_completed + 1,
      current_streak: data.current_streak + 1,
      career_readiness: Math.min(data.career_readiness + 2, 100),
      last_completed: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

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

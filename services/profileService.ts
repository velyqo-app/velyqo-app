import { supabase } from "../lib/supabase";

export const getProfile = async (userId: string) => {
  return await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
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

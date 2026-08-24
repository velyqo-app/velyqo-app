import { supabase } from "../lib/supabase";

export const getDashboardProfile = async (userId: string) => {
  return await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
};

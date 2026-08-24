import { supabase } from "../lib/supabase";

export async function getJournal(userId: string) {
  return await supabase
    .from("career_journal")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
}

interface JournalEntry {
  userId: string;
  title: string;
  description?: string;
  entryType: string;
}

export async function createJournalEntry({
  userId,
  title,
  description,
  entryType,
}: JournalEntry) {
  return await supabase.from("career_journal").insert({
    user_id: userId,
    title,
    description,
    entry_type: entryType,
  });
}

import { supabase } from "../lib/supabase";
import { JournalEntry as JournalEntryRow } from "../types/journal";

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

/**
 * Returns the inserted row (via .select().single()) rather than a bare
 * insert result — added so callers that need the new row's id (Step 7:
 * linking capability_evidence.journal_entry_id) can get it without a
 * second read. The one existing caller (mission-complete.tsx) only ever
 * read `error` from this, so this is purely additive to the response
 * shape, not a behavior change.
 */
export async function createJournalEntry({
  userId,
  title,
  description,
  entryType,
}: JournalEntry) {
  return await supabase
    .from("career_journal")
    .insert({
      user_id: userId,
      title,
      description,
      entry_type: entryType,
    })
    .select()
    .returns<JournalEntryRow[]>()
    .single();
}

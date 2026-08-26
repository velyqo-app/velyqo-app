/**
 * A row from the `career_journal` table.
 */
export interface JournalEntry {
  id: string;

  user_id: string;

  title: string;

  description: string | null;

  entry_type: string;

  created_at: string;
}

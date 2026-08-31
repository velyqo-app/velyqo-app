/**
 * A row from the `profiles` table.
 *
 * Field names are snake_case because this mirrors the database row exactly.
 * The camelCase equivalent used inside the UI is `UserData` in
 * context/UserContext — do not mix the two. Reading camelCase keys off a raw
 * row is what previously sent "Current Role: undefined" to the AI coach.
 */
export interface Profile {
  user_id: string;

  full_name: string | null;

  goal: string | null;

  country: string | null;

  user_type: string | null;

  current_role: string | null;

  current_salary: number | null;

  target_role: string | null;

  target_salary: number | null;

  current_occupation_id: string | null;

  target_occupation_id: string | null;

  starting_situation: string | null;

  experience_level: string | null;

  education_level: string | null;

  /** Postgres text[]. Absent (pre-migration) reads as null, not []. */
  skills: string[] | null;

  target_timeframe: string | null;
}

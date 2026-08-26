/**
 * A row from the `user_progress` table.
 */
export interface Progress {
  user_id: string;

  missions_completed: number;

  current_streak: number;

  career_readiness: number;

  last_completed: string | null;
}

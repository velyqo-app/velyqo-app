/**
 * A single career mission shown to the user.
 *
 * `estimatedTime` and `impact` are required because the dashboard's
 * DailyBriefCard renders both. They were previously read from this shape
 * without being defined on it, which rendered two blank fields.
 */
export interface Mission {
  title: string;

  description: string;

  /** Human-readable effort estimate, e.g. "30 mins". */
  estimatedTime: string;

  /** Why completing this mission matters for the user's target role. */
  impact: string;
}

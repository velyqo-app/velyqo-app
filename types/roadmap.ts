/**
 * Verified market salary for one point on the roadmap.
 *
 * Only ever built from an `occupation_salary_bands` row. There is deliberately
 * no way to construct this from a guess, an average, a user-entered figure, or
 * an AI response — if the database has no band, the step carries `salary: null`
 * and the UI must say so rather than substitute a number.
 */
export interface RoadmapSalary {
  currency: string;

  low: number;

  median: number;

  high: number;

  /** 0-100, straight from the database. */
  confidence: number;

  source: string | null;

  sourceUrl: string | null;

  dataType: "OBSERVED" | "AGGREGATED" | "ESTIMATED";
}

/** Where a step came from, so the UI can weight it appropriately. */
export type RoadmapStepSource = "catalogue" | "ai";

/**
 * One position on the roadmap — either a rung from the occupation catalogue or
 * a stage generated from the user's specific transition.
 */
export interface RoadmapStep {
  /** Occupation id for catalogue rungs, or `ai:<order>` for generated ones. */
  id: string;

  order: number;

  title: string;

  /** What this stage actually involves. Empty for bare catalogue rungs. */
  description: string;

  /** Why this stage follows from the user's own background. */
  rationale: string;

  level: string | null;

  /** Verified market data, or null when the database has none. */
  salary: RoadmapSalary | null;

  skills: string[];

  actions: string[];

  estimatedTime: string | null;

  source: RoadmapStepSource;
}

/**
 * Machine-readable reasons a roadmap is less complete than it could be, so the
 * UI can explain the gap instead of silently rendering a thinner roadmap.
 */
export type RoadmapLimitation =
  | "CURRENT_ROLE_NOT_IN_CATALOGUE"
  | "TARGET_ROLE_NOT_IN_CATALOGUE"
  | "UNKNOWN_LEVEL"
  | "NO_LADDER_DATA"
  | "NO_COUNTRY"
  | "NO_SALARY_DATA"
  | "AI_UNAVAILABLE";

export interface RoadmapEndpoint {
  title: string;

  occupationId: string | null;

  level: string | null;

  /** Verified market data for this role, or null. */
  salary: RoadmapSalary | null;

  /**
   * What the user told us during onboarding. Real information, but their own
   * figure rather than market data — never present it as the latter.
   */
  statedSalary: number | null;
}

/**
 * How the steps were produced.
 *
 * `catalogue` — every step is a verified occupation from the database.
 * `ai`        — steps were generated for this specific transition.
 * `endpoints-only` — no steps could be produced; see `limitations`.
 */
export type RoadmapGeneration = "catalogue" | "ai" | "endpoints-only";

export interface Roadmap {
  current: RoadmapEndpoint;

  target: RoadmapEndpoint;

  /** Progression between current and target, ending at the target. */
  steps: RoadmapStep[];

  /** Two or three sentences describing the overall transition. */
  summary: string | null;

  /** Skills the user already has that carry into the target role. */
  transferableSkills: string[];

  generation: RoadmapGeneration;

  /** ISO timestamp, used for cache display and invalidation. */
  generatedAt: string | null;

  limitations: RoadmapLimitation[];

  /** The single thing to do next, or null when there is nothing to say. */
  nextAction: string | null;
}

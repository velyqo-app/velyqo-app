import { SalaryPriority } from "./careerContext";

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
 * One display-only career suggestion, distinct from the roadmap's target.
 * AI-derived guidance, not a database fact — never carries its own salary
 * figure unless it happens to match a catalogued occupation elsewhere.
 */
export interface AlternativeCareer {
  title: string;

  /** Must reference something specific to this person, not a generic reason
   * that would apply to anyone — enforced when parsing the AI response. */
  whySuitable: string;
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

  /**
   * Currency to display `statedSalary` in, derived from the user's country —
   * independent of whether `salary` (market data) exists, so a stated figure
   * is never left unlabelled just because the role has no verified band.
   */
  currency: string | null;
}

/**
 * Total time from today to the target role, derived from the roadmap's own
 * steps rather than invented.
 *
 * `minMonths`/`maxMonths` are always bounded by the steps' own estimates —
 * never shorter than the single longest step, never longer than adding every
 * step up sequentially. Within that envelope they may reflect the AI's
 * reasoning about which steps can overlap, so the range is not simply the
 * sum of every step's estimate.
 */
export interface RoadmapJourneyEstimate {
  minMonths: number;

  maxMonths: number;

  /** How many steps had a usable time estimate. */
  stepsCounted: number;

  /** Total steps in the roadmap, for an honest "based on N of M" caveat. */
  stepsTotal: number;
}

/**
 * How the steps were produced.
 *
 * `catalogue` — every step is a verified occupation from the database.
 * `ai`        — steps were generated for this specific transition.
 * `endpoints-only` — no steps could be produced; see `limitations`.
 */
export type RoadmapGeneration = "catalogue" | "ai" | "endpoints-only";

/**
 * Present only when this roadmap's `target` is NOT the role the user
 * originally entered — i.e. they hit a confirmed salary conflict and chose
 * "salary" or "balance" over their requested role. Exists so the UI can
 * always say plainly "you asked for X; this targets Y because Z," and never
 * silently substitute one for the other.
 *
 * Absent (null) whenever `target` is exactly what was requested — which is
 * the deliberate, common case: no conflict, or the user chose to keep their
 * requested role.
 */
export interface DestinationResolution {
  requestedTitle: string;

  requestedSalary: number | null;

  priority: SalaryPriority;

  /** The AI's qualitative reasoning for this resolution, or null if the
   * assessment call was unavailable — never fabricated after the fact. */
  explanation: string | null;
}

export interface Roadmap {
  current: RoadmapEndpoint;

  target: RoadmapEndpoint;

  /** Null unless `target` differs from what the user actually requested. */
  destinationResolution: DestinationResolution | null;

  /** Progression between current and target, ending at the target. */
  steps: RoadmapStep[];

  /** Two or three sentences describing the overall transition. */
  summary: string | null;

  /** Skills the user already has that carry into the target role. */
  transferableSkills: string[];

  /**
   * Other careers that could plausibly suit this person, given their real
   * stated context. Display-only — a suggestion, never a substitute for
   * `target`. Never auto-selected, never silently replaces the requested
   * role. Empty when nothing genuinely fits, which is expected, not an
   * error.
   */
  alternativeCareers: AlternativeCareer[];

  /**
   * Formal qualifications, licensing, or registration the AI believes the
   * target profession requires. This is the model's own knowledge, not a
   * database fact — render it labelled as AI guidance, never as verified.
   */
  regulatoryConsiderations: string[];

  /** Null when no step has a usable time estimate — never a guess. */
  estimatedJourney: RoadmapJourneyEstimate | null;

  generation: RoadmapGeneration;

  /** ISO timestamp, used for cache display and invalidation. */
  generatedAt: string | null;

  limitations: RoadmapLimitation[];

  /** The single thing to do next, or null when there is nothing to say. */
  nextAction: string | null;
}

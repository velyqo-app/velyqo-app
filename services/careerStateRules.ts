import { CapabilityGap } from "../types/capability";
import { CareerState } from "../types/careerState";

/**
 * Phase 9.1 Step 3 — deterministic rules that INTERPRET an already-
 * assembled CareerState (services/careerStateService.ts). Every function
 * in this file is pure: no Supabase, no AsyncStorage, no AI, no writes, no
 * network — each one just reads fields already present on a CareerState
 * (or a plain CapabilityGap[]) and returns a small, deterministic,
 * derived fact. Nothing here re-derives or duplicates what
 * careerStateService.ts already computed (e.g. `focus.priorityCapabilityGap`
 * is read here, never recalculated) — this file adds one more layer of
 * interpretation on top of that single assembled object, not a second
 * competing CareerState.
 *
 * This is explicitly NOT the Next Move Engine: every export below answers
 * "what is true right now" (a fact), never "what should the user do next"
 * (a recommendation) — that judgment is Step 9.2's job, deliberately kept
 * out of this file.
 *
 * types/careerState.ts (the Step 1 contract) is not modified by this file
 * — no genuine contradiction was found that required changing it; see the
 * Step 3 report.
 */

/**
 * Whether the user has a meaningful destination yet, and how far VELYQO's
 * own understanding of it has progressed — never persisted, recomputed
 * fresh from the CareerState passed in every time.
 *
 * - "no_destination": no target role at all (CareerState.destination
 *   .targetRole is "", the same honest-missing convention used throughout
 *   the app — never inferred from any other field).
 * - "destination_set": a target role exists, but no capability assessment
 *   has been generated for it yet (CareerState.capabilities is empty).
 *   Never a trigger to generate one — that stays owned entirely by the
 *   existing capability-gap assessment flow.
 * - "destination_assessed": a target role exists AND at least one
 *   capability_gaps row exists for it, regardless of what those rows'
 *   individual statuses are (even an assessment where every capability is
 *   still "unknown" counts as assessed — the assessment itself exists;
 *   see CapabilitySummary below for what those statuses actually are).
 */
export type DestinationState =
  | "no_destination"
  | "destination_set"
  | "destination_assessed";

export function classifyDestinationState(
  careerState: CareerState,
): DestinationState {
  if (!careerState.destination.targetRole) {
    return "no_destination";
  }

  if (careerState.capabilities.length === 0) {
    return "destination_set";
  }

  return "destination_assessed";
}

/**
 * A plain count of each existing capability status — never a score, never
 * a percentage, never a weighted or ranked figure. Field names match
 * types/capability.ts's CapabilityStatus values exactly (camelCased) so
 * the mapping is unambiguous and no new status vocabulary is introduced.
 *
 * `unknown` here is a count of capabilities with no evidence either way —
 * counting them is not the same as claiming the user lacks them (see that
 * status's own doc comment in types/capability.ts). `priorityGap` counts
 * capabilities important enough to act on despite missing evidence — not
 * a claim of incapability.
 */
export interface CapabilitySummary {
  total: number;

  strength: number;

  developing: number;

  priorityGap: number;

  unknown: number;
}

export function summarizeCapabilities(
  capabilities: CapabilityGap[],
): CapabilitySummary {
  const summary: CapabilitySummary = {
    total: capabilities.length,
    strength: 0,
    developing: 0,
    priorityGap: 0,
    unknown: 0,
  };

  for (const capability of capabilities) {
    if (capability.status === "strength") {
      summary.strength += 1;
    } else if (capability.status === "developing") {
      summary.developing += 1;
    } else if (capability.status === "priority_gap") {
      summary.priorityGap += 1;
    } else {
      summary.unknown += 1;
    }
  }

  return summary;
}

/**
 * A deterministic, fact-only interpretation of an assembled CareerState —
 * exactly the six facts Step 3 was asked to make derivable: whether a
 * destination exists (and how far assessed), whether priority gaps exist
 * (via capabilitySummary.priorityGap), what the capability mix looks like
 * (developing/strong/unknown counts), whether recent activity exists, and
 * whether an active capability mission exists. Deliberately does NOT
 * include a journey-progress fact: CareerState.progress.journeyProgress is
 * already directly and honestly readable (null or a real
 * RoadmapJourneyEstimate) without any interpretation needed on top of it,
 * and rule 6's own fact list does not ask for one — adding one here would
 * be exactly the kind of "field added because it sounds useful" the brief
 * warns against.
 *
 * This is a fact sheet, not a recommendation — it never says what the user
 * should do next. That is Step 9.2's Next Move Engine, not this file.
 */
export interface CareerStateSummary {
  destinationState: DestinationState;

  capabilitySummary: CapabilitySummary;

  /** True only when CareerState.focus.priorityCapabilityGap is non-null —
   * read directly from the already-assembled CareerState, never
   * recalculated (no applyPriorityRanking call, no write). */
  hasPriorityFocus: boolean;

  /** True only when CareerState.progress.recentActivity has at least one
   * entry — an existence fact, not a count of achievements or a momentum
   * score. */
  hasRecentActivity: boolean;

  /** True only when CareerState.focus.activeMission is non-null. */
  hasActiveCapabilityMission: boolean;
}

export function summarizeCareerState(
  careerState: CareerState,
): CareerStateSummary {
  return {
    destinationState: classifyDestinationState(careerState),

    capabilitySummary: summarizeCapabilities(careerState.capabilities),

    hasPriorityFocus: careerState.focus.priorityCapabilityGap !== null,

    hasRecentActivity: careerState.progress.recentActivity.length > 0,

    hasActiveCapabilityMission: careerState.focus.activeMission !== null,
  };
}

import { Mission } from "../types/mission";
import { getTodaysMission } from "./careerMissionService";

export interface CareerBrief {
  mission: Mission;
  estimatedTime: string;
  nextMilestone: string;
  impact: string;
}

/**
 * Builds the mission-derived part of the dashboard's Career Brief.
 *
 * This used to also compute a readiness score from profile completeness and a
 * projected salary, but useDashboard overwrote the readiness with the real
 * stored value and nothing read the projected salary, so both were dead.
 * Readiness now has a single source: the `user_progress` row.
 */
export function generateCareerBrief(targetRole: string): CareerBrief {
  const mission = getTodaysMission(targetRole);

  return {
    mission,

    estimatedTime: mission.estimatedTime,

    // Until the roadmap exists (Phase 3) there is no real milestone to point
    // at, so the mission itself stands in as the next step.
    nextMilestone: mission.title,

    impact: mission.impact,
  };
}

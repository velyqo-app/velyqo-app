import {
  StartingSituation,
  impliesNoProfessionalExperience,
} from "../types/careerContext";
import { Mission } from "../types/mission";
import { RoadmapStep } from "../types/roadmap";

export type { Mission };

const DEFAULT_ESTIMATED_TIME = "20 mins";

const GENERIC_MISSION: Mission = {
  title: "Continue Learning",
  description:
    "Spend 20 minutes learning a skill related to your target career.",
  estimatedTime: DEFAULT_ESTIMATED_TIME,
  impact:
    "Consistent daily learning compounds faster than occasional long study sessions.",
};

/**
 * Tier 1 — derives today's mission from the real next step of an
 * already-generated, cached roadmap. Never guesses at content the step
 * itself doesn't have.
 *
 * estimatedTime is deliberately never step.estimatedTime — that field is a
 * multi-month duration for the whole step ("3-6 months"), not a daily-task
 * estimate, and showing it next to "Today's Mission" would be nonsensical.
 */
export function missionFromRoadmapStep(step: RoadmapStep): Mission {
  const description =
    step.actions[0]?.trim() ||
    step.description?.trim() ||
    `Look into what moving into ${step.title} actually involves.`;

  const impact =
    step.rationale?.trim() || "This is the next step on your career roadmap.";

  return {
    title: `Work towards ${step.title}`,
    description,
    estimatedTime: DEFAULT_ESTIMATED_TIME,
    impact,
  };
}

/**
 * Tier 2 — used only when no cached roadmap exists yet, or the cached one
 * has no steps. Templates the user's own current/target role into
 * honestly-scoped, generic advice. Never claims roadmap awareness it
 * doesn't have, and never invents specific skills, requirements,
 * qualifications, salary figures, or job-market facts.
 */
export function fallbackMission(
  targetRole: string,
  currentRole: string,
  startingSituation: StartingSituation | "",
): Mission {
  const target = targetRole.trim();

  if (!target) {
    return GENERIC_MISSION;
  }

  const current = currentRole.trim();

  const description =
    current && !impliesNoProfessionalExperience(startingSituation)
      ? `Spend 20 minutes reading a few real ${target} job listings and noting what from your ${current} background could carry over.`
      : `Spend 20 minutes reading a few real ${target} job listings to see what's actually expected day to day.`;

  return {
    title: `Research what ${target} actually requires`,
    description,
    estimatedTime: DEFAULT_ESTIMATED_TIME,
    impact:
      "A full personalized roadmap will appear here once you generate one on the Career Timeline.",
  };
}

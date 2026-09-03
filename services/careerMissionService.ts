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

const missions: Record<string, Mission> = {
  "head of engineering": {
    title: "Leadership Development",
    description:
      "Spend 30 minutes studying engineering leadership or mentoring a colleague today.",
    estimatedTime: "30 mins",
    impact:
      "Leadership is the main thing separating senior engineers from engineering leaders.",
  },

  manager: {
    title: "Practice Leadership",
    description:
      "Lead a meeting, coach a teammate, or improve a team process today.",
    estimatedTime: "30 mins",
    impact:
      "Visible leadership is what hiring managers look for when promoting into management.",
  },

  "metrology engineer": {
    title: "Improve Technical Skills",
    description:
      "Learn one new metrology technique or measurement best practice today.",
    estimatedTime: "20 mins",
    impact:
      "Deeper measurement expertise is the clearest signal of technical seniority in metrology.",
  },
};

/**
 * Unchanged from before this phase — still used by aiContextService for the
 * AI Coach's system-prompt context, which this phase deliberately does not
 * touch. The Dashboard's own Today's Mission no longer calls this; see
 * missionFromRoadmapStep / fallbackMission below, which derive from the
 * user's real roadmap (or honestly degrade) instead of this fixed table.
 */
export function getTodaysMission(targetRole?: string): Mission {
  const role = (targetRole ?? "").toLowerCase();

  return missions[role] ?? GENERIC_MISSION;
}

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

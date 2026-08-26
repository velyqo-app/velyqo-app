import { Mission } from "../types/mission";

export type { Mission };

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

export function getTodaysMission(targetRole?: string): Mission {
  const role = (targetRole ?? "").toLowerCase();

  return (
    missions[role] ?? {
      title: "Continue Learning",
      description:
        "Spend 20 minutes learning a skill related to your target career.",
      estimatedTime: "20 mins",
      impact:
        "Consistent daily learning compounds faster than occasional long study sessions.",
    }
  );
}

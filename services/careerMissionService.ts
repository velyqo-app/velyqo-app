export type Mission = {
  title: string;
  description: string;
};

const missions: Record<string, Mission> = {
  "head of engineering": {
    title: "Leadership Development",
    description:
      "Spend 30 minutes studying engineering leadership or mentoring a colleague today.",
  },

  manager: {
    title: "Practice Leadership",
    description:
      "Lead a meeting, coach a teammate, or improve a team process today.",
  },

  "metrology engineer": {
    title: "Improve Technical Skills",
    description:
      "Learn one new metrology technique or measurement best practice today.",
  },
};

export function getTodaysMission(targetRole?: string): Mission {
  const role = (targetRole ?? "").toLowerCase();

  return (
    missions[role] ?? {
      title: "Continue Learning",
      description:
        "Spend 20 minutes learning a skill related to your target career.",
    }
  );
}
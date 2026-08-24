import { salaryData } from "../data/salaries";
import { getTodaysMission } from "./careerMissionService";

interface Params {
  goal: string;
  currentRole: string;
  targetRole: string;
  currentSalary: string;
  targetSalary: string;
}

export function generateCareerBrief({
  goal,
  currentRole,
  targetRole,
  currentSalary,
  targetSalary,
}: Params) {
  const role = salaryData[targetRole.toLowerCase() as keyof typeof salaryData];

  const mission = getTodaysMission(targetRole);

  let readiness = 0;

  if (goal) readiness += 20;
  if (currentRole) readiness += 20;
  if (targetRole) readiness += 20;
  if (currentSalary) readiness += 20;
  if (targetSalary) readiness += 20;

  return {
    readiness,

    mission,

    estimatedTime: mission.estimatedTime,

    nextMilestone: mission.title,

    impact: mission.impact,

    projectedSalary: role?.average ?? 0,
  };
}

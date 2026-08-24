import { useMemo } from "react";

import { salaryData } from "../data/salaries";

import { useProfile } from "./useProfile";
import { useProgress } from "./useProgress";

import { getMomentum } from "../services/momentumService";

import { generateCareerBrief } from "../services/careerIntelligenceService";
import { getRecommendation } from "../services/recommendationService";

export function useDashboard() {
  const { loading: profileLoading, userData } = useProfile();

  const { loading: progressLoading, progress } = useProgress();

  const dashboard = useMemo(() => {
    const roleInfo =
      salaryData[userData.targetRole.toLowerCase() as keyof typeof salaryData];

    const recommendation = getRecommendation(userData.goal);

    const careerBrief = generateCareerBrief({
      goal: userData.goal,
      currentRole: userData.currentRole,
      targetRole: userData.targetRole,
      currentSalary: userData.currentSalary,
      targetSalary: userData.targetSalary,
    });

    const momentum = getMomentum(progress.current_streak);

    return {
      roleInfo,
      recommendation,
      momentum,

      careerBrief: {
        ...careerBrief,

        readiness: progress.career_readiness,
      },
    };
  }, [userData, progress]);

  return {
    loading: profileLoading || progressLoading,

    userData,

    progress,

    ...dashboard,
  };
}

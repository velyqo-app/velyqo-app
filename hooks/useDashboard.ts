import { useMemo } from "react";

import { getIndicativeSalary } from "../data/salaries";

import { useProfile } from "./useProfile";
import { useProgress } from "./useProgress";

import { getMomentum } from "../services/momentumService";

import { generateCareerBrief } from "../services/careerIntelligenceService";
import { getRecommendation } from "../services/recommendationService";

export function useDashboard() {
  const { loading: profileLoading, userData } = useProfile();

  const { loading: progressLoading, progress } = useProgress();

  const dashboard = useMemo(() => {
    // Null whenever we have no reliable figure for this role and country.
    const roleInfo = getIndicativeSalary(userData.targetRole, userData.country);

    // The user's own stated target is real data and always wins. The seeded
    // market average is only a fallback, and if neither exists the card must
    // render an unavailable state rather than a zero.
    const statedTargetSalary = Number(userData.targetSalary) || null;

    const targetSalary = statedTargetSalary ?? roleInfo?.average ?? null;

    const targetSalarySource = statedTargetSalary
      ? ("stated" as const)
      : roleInfo
        ? ("market" as const)
        : null;

    const recommendation = getRecommendation(userData.goal);

    const careerBrief = generateCareerBrief(userData.targetRole);

    const momentum = getMomentum(progress.current_streak);

    return {
      roleInfo,
      targetSalary,
      targetSalarySource,
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

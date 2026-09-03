import { useEffect, useMemo, useState } from "react";

import { useProfile } from "./useProfile";
import { useProgress } from "./useProgress";

import { toCountryCode } from "../services/countryService";
import { getMomentum } from "../services/momentumService";
import { loadSalary, resolveEndpoint } from "../services/roadmapService";

import { generateCareerBrief } from "../services/careerIntelligenceService";
import { getRecommendation } from "../services/recommendationService";

import { RoadmapSalary } from "../types/roadmap";

export function useDashboard() {
  const {
    loading: profileLoading,
    error: profileError,
    userData,
    reloadProfile,
  } = useProfile();

  const { loading: progressLoading, progress } = useProgress();

  const { targetRole, targetOccupationId, country } = userData;

  // Verified market data for the target role, or null — same authoritative
  // lookup Career Timeline uses (resolveEndpoint + loadSalary against
  // occupation_salary_bands), never the retired seeded table in
  // data/salaries.ts, so the two screens can never disagree on this figure.
  const [targetSalaryBand, setTargetSalaryBand] =
    useState<RoadmapSalary | null>(null);

  const [salaryLoading, setSalaryLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    // A failed profile load or an unset target role has nothing to resolve —
    // skip the lookup rather than firing it against stale/blank data.
    if (profileError || !targetRole.trim()) {
      setTargetSalaryBand(null);
      setSalaryLoading(false);
      return;
    }

    let active = true;

    setSalaryLoading(true);

    const loadTargetSalary = async () => {
      const occupation = await resolveEndpoint(targetRole, targetOccupationId);
      const band = await loadSalary(occupation?.id ?? null, toCountryCode(country));

      if (active) {
        setTargetSalaryBand(band);
        setSalaryLoading(false);
      }
    };

    loadTargetSalary();

    return () => {
      active = false;
    };
  }, [profileLoading, profileError, targetRole, targetOccupationId, country]);

  const dashboard = useMemo(() => {
    const recommendation = getRecommendation(userData.goal);

    const careerBrief = generateCareerBrief(userData.targetRole);

    const momentum = getMomentum(progress.current_streak);

    return {
      recommendation,
      momentum,

      careerBrief: {
        ...careerBrief,

        readiness: progress.career_readiness,
      },
    };
  }, [userData, progress]);

  // The user's own stated figure is real data and always wins over market
  // data — never blended into a single number, so the two are never
  // presented as though they're the same kind of information.
  const statedTargetSalary = Number(userData.targetSalary) || null;

  const targetSalarySource = statedTargetSalary
    ? ("stated" as const)
    : targetSalaryBand
      ? ("verified" as const)
      : null;

  return {
    loading: profileLoading || progressLoading || salaryLoading,

    error: profileError,
    retry: reloadProfile,

    userData,

    progress,

    statedTargetSalary,
    targetSalaryBand,
    targetSalarySource,

    ...dashboard,
  };
}

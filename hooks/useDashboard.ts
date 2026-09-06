import { useEffect, useMemo, useState } from "react";

import { findCachedRoadmap } from "./useRoadmap";
import { useProfile } from "./useProfile";
import { useProgress } from "./useProgress";

import {
  fallbackMission,
  missionFromRoadmapStep,
} from "../services/careerMissionService";
import { getMomentum } from "../services/momentumService";

import { getRecommendation } from "../services/recommendationService";

import { Mission } from "../types/mission";
import { RoadmapJourneyEstimate } from "../types/roadmap";

export function useDashboard() {
  const {
    loading: profileLoading,
    error: profileError,
    userData,
    reloadProfile,
  } = useProfile();

  const { loading: progressLoading, progress } = useProgress();

  const {
    currentRole,
    currentOccupationId,
    currentSalary,
    targetRole,
    targetOccupationId,
    targetSalary,
    country,
    goal,
    startingSituation,
    experienceLevel,
    educationLevel,
    skills,
    targetTimeframe,
  } = userData;

  // Today's Mission: Tier 1 derives it from the real next step of an
  // already-cached roadmap (read-only — never builds or generates one, and
  // never a new AI call); Tier 2 falls back to a role-aware but honestly
  // generic mission when no usable cached roadmap exists yet.
  const [missionInfo, setMissionInfo] = useState<{
    mission: Mission;
    nextMilestone: string;
    // Null whenever no cached roadmap exists yet (the fallback-mission
    // branches below) — Home's Journey summary reads this to show an honest
    // "no roadmap yet" state rather than a guessed duration.
    estimatedJourney: RoadmapJourneyEstimate | null;
  }>(() => {
    const mission = fallbackMission("", "", "");
    return { mission, nextMilestone: mission.title, estimatedJourney: null };
  });

  const [missionLoading, setMissionLoading] = useState(true);

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    if (profileError) {
      const mission = fallbackMission("", "", "");
      setMissionInfo({ mission, nextMilestone: mission.title, estimatedJourney: null });
      setMissionLoading(false);
      return;
    }

    let active = true;

    setMissionLoading(true);

    const loadMission = async () => {
      const roadmap = await findCachedRoadmap(userData);

      if (!active) {
        return;
      }

      if (roadmap && roadmap.steps.length > 0) {
        const step = roadmap.steps[0];
        const stepsTotal = roadmap.estimatedJourney?.stepsTotal;

        setMissionInfo({
          mission: missionFromRoadmapStep(step),
          nextMilestone: stepsTotal
            ? `${step.title} (Step ${step.order} of ${stepsTotal})`
            : step.title,
          estimatedJourney: roadmap.estimatedJourney,
        });
      } else {
        const mission = fallbackMission(targetRole, currentRole, startingSituation);

        setMissionInfo({ mission, nextMilestone: mission.title, estimatedJourney: null });
      }

      setMissionLoading(false);
    };

    loadMission();

    return () => {
      active = false;
    };
  }, [
    profileLoading,
    profileError,
    currentRole,
    currentOccupationId,
    currentSalary,
    targetRole,
    targetOccupationId,
    targetSalary,
    country,
    goal,
    startingSituation,
    experienceLevel,
    educationLevel,
    skills,
    targetTimeframe,
  ]);

  const dashboard = useMemo(() => {
    const recommendation = getRecommendation(userData.goal);

    const momentum = getMomentum(progress.current_streak);

    return {
      recommendation,
      momentum,

      careerBrief: {
        mission: missionInfo.mission,
        estimatedTime: missionInfo.mission.estimatedTime,
        nextMilestone: missionInfo.nextMilestone,
        impact: missionInfo.mission.impact,
        estimatedJourney: missionInfo.estimatedJourney,

        readiness: progress.career_readiness,
      },
    };
  }, [userData, progress, missionInfo]);

  return {
    loading: profileLoading || progressLoading || missionLoading,

    error: profileError,
    retry: reloadProfile,

    userData,

    progress,

    ...dashboard,
  };
}

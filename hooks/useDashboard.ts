import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { findCachedRoadmap } from "./useRoadmap";
import { useProfile } from "./useProfile";
import { useProgress } from "./useProgress";

import { selectCapabilityMission } from "../services/capabilityMissionService";
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

  // Today's Mission: Tier 0 (new) uses the user's single highest-priority
  // persisted capability gap when one exists — a deterministic, templated
  // mission, never a new AI call (see capabilityMissionService — it reuses
  // Step 5's read-only priority service, it does not generate an
  // assessment). Tier 1 derives it from the real next step of an
  // already-cached roadmap (read-only — never builds or generates one, and
  // never a new AI call either); Tier 2 falls back to a role-aware but
  // honestly generic mission when no usable cached roadmap exists yet. Any
  // Tier 0 failure (no target role, no assessment yet, read error) falls
  // through silently to Tier 1/2 exactly as before — capabilityMissionService
  // never throws and never returns an error Home needs to surface.
  const [missionInfo, setMissionInfo] = useState<{
    mission: Mission;
    nextMilestone: string;
    // Null whenever no cached roadmap exists yet (the fallback-mission
    // branches below) — Home's Journey summary reads this to show an honest
    // "no roadmap yet" state rather than a guessed duration. Independent of
    // which tier supplies `mission` — the roadmap either exists or it
    // doesn't, regardless of what Today's Mission happens to be.
    estimatedJourney: RoadmapJourneyEstimate | null;
    // Non-null only when `mission` is the Tier 0 capability mission — carried
    // through Home → Coach → Mission Complete so a future step can attach
    // evidence to the right capability_gaps row.
    capabilityGapId: string | null;
    capabilityName: string | null;
  }>(() => {
    const mission = fallbackMission("", "", "");
    return {
      mission,
      nextMilestone: mission.title,
      estimatedJourney: null,
      capabilityGapId: null,
      capabilityName: null,
    };
  });

  const [missionLoading, setMissionLoading] = useState(true);

  // Step 8 fix: mission selection must refresh on focus, not just on
  // mount/profile-field change. Step 7's evidence flow can change a
  // capability's status/priority from OUTSIDE Home (mission-complete.tsx),
  // so without this, returning to Home after completing a capability
  // mission showed the just-completed mission again — a stale "Next Move"
  // — even though useProgress (below) already correctly refreshed
  // readiness/streak on the same return. hasLoadedMissionOnce follows the
  // exact Phase 7 pattern already used by useProgress/useCapabilityGaps:
  // only the very first load shows full loading; every later focus
  // refreshes silently, so Home never flashes a full-screen loader on an
  // ordinary refocus.
  const hasLoadedMissionOnce = useRef(false);

  useEffect(() => {
    hasLoadedMissionOnce.current = false;
  }, [targetRole]);

  useFocusEffect(
    useCallback(() => {
      if (profileLoading) {
        return;
      }

      if (profileError) {
        const mission = fallbackMission("", "", "");
        setMissionInfo({
          mission,
          nextMilestone: mission.title,
          estimatedJourney: null,
          capabilityGapId: null,
          capabilityName: null,
        });
        setMissionLoading(false);
        hasLoadedMissionOnce.current = true;
        return;
      }

      let active = true;

      const showFullLoading = !hasLoadedMissionOnce.current;

      if (showFullLoading) {
        setMissionLoading(true);
      }

      const loadMission = async () => {
        const [roadmap, capabilityMission] = await Promise.all([
          findCachedRoadmap(userData),
          userData.userId
            ? selectCapabilityMission(userData.userId, targetRole)
            : Promise.resolve(null),
        ]);

        if (!active) {
          return;
        }

        hasLoadedMissionOnce.current = true;

        const estimatedJourney = roadmap?.estimatedJourney ?? null;

        if (capabilityMission) {
          setMissionInfo({
            mission: capabilityMission.mission,
            nextMilestone: capabilityMission.mission.title,
            estimatedJourney,
            capabilityGapId: capabilityMission.capabilityGapId,
            capabilityName: capabilityMission.capabilityName,
          });
        } else if (roadmap && roadmap.steps.length > 0) {
          const step = roadmap.steps[0];
          const stepsTotal = roadmap.estimatedJourney?.stepsTotal;

          setMissionInfo({
            mission: missionFromRoadmapStep(step),
            nextMilestone: stepsTotal
              ? `${step.title} (Step ${step.order} of ${stepsTotal})`
              : step.title,
            estimatedJourney,
            capabilityGapId: null,
            capabilityName: null,
          });
        } else {
          const mission = fallbackMission(targetRole, currentRole, startingSituation);

          setMissionInfo({
            mission,
            nextMilestone: mission.title,
            estimatedJourney: null,
            capabilityGapId: null,
            capabilityName: null,
          });
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
    ]),
  );

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
        capabilityGapId: missionInfo.capabilityGapId,
        capabilityName: missionInfo.capabilityName,

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

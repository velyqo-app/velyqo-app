import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { findCachedRoadmap } from "./useRoadmap";
import { useProfile } from "./useProfile";
import { useProgress } from "./useProgress";

import { isCapabilityAssessmentInProgress } from "../services/capabilityAssessmentService";
import { getCareerStateWithSummary } from "../services/careerStateService";
import { getMomentum } from "../services/momentumService";
import { selectNextMove } from "../services/nextMoveEngine";

import { getRecommendation } from "../services/recommendationService";

import { NextMove } from "../types/nextMove";
import { RoadmapJourneyEstimate } from "../types/roadmap";

/**
 * Never actually rendered as-is: dashboard.tsx only reaches NextMoveCard
 * once `loading` is false, and the three branches below that use this
 * placeholder (initial state, profileError, missing userId) all also set
 * `missionLoading` to false without ever being the FIRST thing the screen
 * shows in practice (profileError routes to the screen's own dedicated
 * error view instead). Shaped as "up_to_date" — not "needs_destination" —
 * specifically so that IF it were ever shown, tapping it goes to Journey
 * (always a safe, reasonable destination) rather than incorrectly telling
 * a user who already has a target role that they need to set one.
 */
const PLACEHOLDER_NEXT_MOVE: NextMove = {
  type: "up_to_date",
  title: "We couldn't load your next move",
  description: "Please check your connection and try again.",
};

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

  // Today's Mission is now selected entirely by nextMoveEngine.selectNextMove
  // — the single source of truth for the capability_gap / roadmap / generic /
  // needs_destination / up_to_date decision. This hook's only remaining job
  // is to gather that function's two inputs (CareerState + CareerStateSummary
  // via getCareerStateWithSummary, and the existing cached Roadmap via
  // findCachedRoadmap — unchanged, still cache-only, never generates) and
  // hand them to the engine. No mission-selection or capability-ranking
  // logic lives in this file anymore.
  const [nextMove, setNextMove] = useState<NextMove>(PLACEHOLDER_NEXT_MOVE);

  // Independent of nextMove: JourneySummaryCard shows OVERALL roadmap
  // progress, not "today's mission" — it must keep reflecting the real
  // cached roadmap's estimate regardless of which tier the engine picked.
  const [estimatedJourney, setEstimatedJourney] =
    useState<RoadmapJourneyEstimate | null>(null);

  const [missionLoading, setMissionLoading] = useState(true);

  // Phase 12 — true only while a background capability assessment is
  // actively being generated for the CURRENT target role AND the engine's
  // best answer right now is still the generic Tier 2 fallback (i.e.
  // there's genuinely nothing better to show yet). Never true once real
  // capability-gap or roadmap data exists, and never touches nextMove
  // itself — this only tells Home whether the generic mission it's about
  // to render is a stand-in that's about to be replaced, not VELYQO's
  // considered recommendation.
  const [assessmentInProgress, setAssessmentInProgress] = useState(false);

  // Step 8's fix, preserved unchanged: mission selection must refresh on
  // focus, not just on mount/profile-field change, since Step 7's evidence
  // flow can change a capability's status/priority from OUTSIDE Home
  // (mission-complete.tsx). hasLoadedMissionOnce follows the exact Phase 7
  // pattern already used by useProgress/useCapabilityGaps: only the very
  // first load shows full loading; every later focus refreshes silently.
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
        setNextMove(PLACEHOLDER_NEXT_MOVE);
        setEstimatedJourney(null);
        setAssessmentInProgress(false);
        setMissionLoading(false);
        hasLoadedMissionOnce.current = true;
        return;
      }

      // Should not be reachable in practice — this screen only renders
      // behind the authenticated route guard, which implies a session —
      // but userId is nullable on UserData until a session resolves, so
      // this satisfies that honestly rather than asserting it away.
      if (!userData.userId) {
        setNextMove(PLACEHOLDER_NEXT_MOVE);
        setEstimatedJourney(null);
        setAssessmentInProgress(false);
        setMissionLoading(false);
        hasLoadedMissionOnce.current = true;
        return;
      }

      let active = true;

      const showFullLoading = !hasLoadedMissionOnce.current;

      if (showFullLoading) {
        setMissionLoading(true);
      }

      const loadNextMove = async () => {
        const [roadmap, careerStateResult] = await Promise.all([
          findCachedRoadmap(userData),
          getCareerStateWithSummary(userData.userId as string),
        ]);

        if (!active) {
          return;
        }

        hasLoadedMissionOnce.current = true;

        if (careerStateResult.error !== null) {
          console.warn(
            "Home: CareerState read failed:",
            careerStateResult.error,
          );

          // Silent-refresh failure: leave whatever is already on screen
          // alone rather than overwrite a working Next Move with a guess —
          // the same principle useCapabilityGaps already established. Only
          // the very first load (nothing shown yet) falls back to the
          // placeholder.
          if (showFullLoading) {
            setNextMove(PLACEHOLDER_NEXT_MOVE);
            setEstimatedJourney(null);
            setAssessmentInProgress(false);
          }

          setMissionLoading(false);
          return;
        }

        const { state, summary } = careerStateResult.data;

        const move = selectNextMove(state, summary, roadmap);

        setNextMove(move);
        setEstimatedJourney(roadmap?.estimatedJourney ?? null);

        // Phase 12 — only meaningful when the engine actually fell through
        // to Tier 2: a real capability_gap/roadmap mission, or the honest
        // "needs_destination"/"up_to_date" states, are never masked or
        // relabelled by this.
        setAssessmentInProgress(
          move.type === "generic" &&
            isCapabilityAssessmentInProgress(
              userData.userId as string,
              targetRole,
            ),
        );

        setMissionLoading(false);
      };

      loadNextMove();

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
        nextMove,
        estimatedJourney,
        assessmentInProgress,

        readiness: progress.career_readiness,
      },
    };
  }, [userData, progress, nextMove, estimatedJourney, assessmentInProgress]);

  return {
    loading: profileLoading || progressLoading || missionLoading,

    error: profileError,
    retry: reloadProfile,

    userData,

    progress,

    ...dashboard,
  };
}

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useProfile } from "./useProfile";
import { loadOrCreateCapabilityAssessment } from "../services/capabilityAssessmentService";
import { CapabilityGap } from "../types/capability";

export type CapabilityGapsPhase = "no_target_role" | "loading" | "ready" | "error";

/**
 * Orchestrates the Career Gap screen's data: reads an existing assessment,
 * or generates and persists one when none exists yet. Step 7 adds a
 * silent focus-refresh (the Phase 7 pattern) that Step 4 deliberately did
 * not need: completing a capability mission now changes a gap's persisted
 * status/priority_rank from OUTSIDE this screen (mission-complete.tsx), so
 * revisiting Career Gaps must be able to pick that up without requiring a
 * full app restart.
 *
 * hasLoadedOnce gates whether a given load is allowed to show the
 * full-screen loading state: the very first load of a target role does
 * (unchanged from Step 4's behavior), every later focus refreshes in the
 * background instead — the currently-displayed capabilities stay on screen
 * until fresh ones arrive, and a failed silent refresh is simply dropped
 * rather than overwriting an already-good screen with an error (a real
 * failure only becomes visible if it happens on the very first load, or
 * via an explicit Retry). inFlightForRole still guards against two loads
 * running concurrently (e.g. a fast focus + a manual Retry tap), and the
 * per-invocation `active` flag (focus path only) discards a result that
 * resolves after a newer focus has already superseded it — together, the
 * same three safety ideas Phase 7's useProgress established.
 */
export function useCapabilityGaps() {
  const { userData, loading: profileLoading } = useProfile();

  const [phase, setPhase] = useState<CapabilityGapsPhase>("loading");
  const [capabilities, setCapabilities] = useState<CapabilityGap[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const inFlightForRole = useRef<string | null>(null);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const targetRole = userData.targetRole?.trim() ?? "";

  // A target-role change is a genuinely different assessment — its first
  // load should show full loading too, not silently refresh over the
  // previous role's stale screen.
  useEffect(() => {
    hasLoadedOnce.current = false;
  }, [targetRole]);

  // Shared by both callers below. `showFullLoading` controls whether this
  // run is allowed to touch `phase`/`errorMessage` before and on failure;
  // `isActive` lets the focus-triggered caller discard a stale result — the
  // explicit Retry caller has no newer call that could supersede it, so it
  // always passes `() => true`.
  const runLoad = useCallback(
    (showFullLoading: boolean, isActive: () => boolean) => {
      if (!targetRole) {
        setPhase("no_target_role");
        return;
      }

      // Should not be reachable in practice — this screen only renders
      // behind the authenticated route guard, which implies a session —
      // but userId is nullable on UserData until a session resolves, so
      // this satisfies that honestly rather than asserting it away.
      if (!userData.userId) {
        setPhase("error");
        setErrorMessage("We couldn't load your account. Please try again.");
        return;
      }

      if (inFlightForRole.current === targetRole) {
        return;
      }

      inFlightForRole.current = targetRole;

      if (showFullLoading) {
        setPhase("loading");
        setErrorMessage(null);
      }

      loadOrCreateCapabilityAssessment(
        userData.userId,
        userData.currentRole,
        targetRole,
        userData.skills,
      ).then((result) => {
        inFlightForRole.current = null;

        if (!mountedRef.current || !isActive()) {
          return;
        }

        hasLoadedOnce.current = true;

        if (result.error !== null) {
          if (showFullLoading) {
            setPhase("error");
            setErrorMessage(result.error);
          }
          return;
        }

        if (result.data.length === 0) {
          if (showFullLoading) {
            setPhase("error");
            setErrorMessage(
              "We couldn't load your capability assessment. Please try again.",
            );
          }
          return;
        }

        setCapabilities(result.data);
        setPhase("ready");
      });
    },
    [targetRole, userData.userId, userData.currentRole, userData.skills],
  );

  const retry = useCallback(() => {
    runLoad(true, () => true);
  }, [runLoad]);

  useFocusEffect(
    useCallback(() => {
      if (profileLoading) {
        return;
      }

      let active = true;

      runLoad(!hasLoadedOnce.current, () => active);

      return () => {
        active = false;
      };
    }, [profileLoading, runLoad]),
  );

  return { phase, capabilities, errorMessage, retry };
}

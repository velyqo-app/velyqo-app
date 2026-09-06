import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useProfile } from "./useProfile";
import { generateCapabilities } from "../services/capabilityGenerationService";
import { saveCapabilityAssessment } from "../services/capabilityPersistenceService";
import { applyPriorityRanking } from "../services/capabilityPriorityService";
import { CapabilityGap } from "../types/capability";

export type CapabilityGapsPhase = "no_target_role" | "loading" | "ready" | "error";

type LoadResult =
  | { data: CapabilityGap[]; error: null }
  | { data: null; error: string };

/**
 * Read-before-write: only generates and persists when no assessment exists
 * yet for this exact user + target role. This is the primary defense
 * against creating a duplicate assessment on a revisit — the in-flight
 * guard in the hook below additionally protects a single hook instance
 * against triggering a second concurrent run before this settles (see the
 * Step 4 report for the one race this does not close).
 *
 * applyPriorityRanking both reads the existing assessment (serving the
 * exists-check below) and brings its priority_rank values up to date on a
 * revisit, without a separate round trip — though in the steady state
 * (ranking already applied at generation time, see below) it does nothing
 * beyond that one read, since an assessment's priority_gap rows are ranked
 * as one unit and are never partially re-ranked. Treated as fatal here on
 * the same basis Step 4 treated a plain getCapabilityGaps failure as
 * fatal: it's this call's read that decides whether an assessment exists
 * at all, so a failure here means that question itself couldn't be
 * answered.
 */
async function loadOrCreateAssessment(
  userId: string,
  currentRole: string,
  targetRole: string,
  confirmedSkills: string[],
): Promise<LoadResult> {
  const rankedExisting = await applyPriorityRanking(userId, targetRole);

  if (rankedExisting.error !== null) {
    return { data: null, error: rankedExisting.error };
  }

  if (rankedExisting.data.length > 0) {
    return { data: rankedExisting.data, error: null };
  }

  const generated = await generateCapabilities({
    currentRole,
    targetRole,
    skills: confirmedSkills,
  });

  if (!generated) {
    return {
      data: null,
      error: "We couldn't generate your capability assessment. Please try again.",
    };
  }

  const saved = await saveCapabilityAssessment(userId, targetRole, generated);

  if (saved.error !== null) {
    return { data: null, error: saved.error };
  }

  // Pass the true AI generation order (still available here, before it gets
  // flattened by persistence — see applyPriorityRanking's doc comment) so
  // this first ranking pass is exact, not the (created_at, id) fallback.
  // Non-fatal: a fresh, already-valid, already-persisted assessment
  // shouldn't be discarded just because this refinement failed, and the
  // screen doesn't display priority_rank anyway.
  const ranked = await applyPriorityRanking(
    userId,
    targetRole,
    generated.map((capability) => capability.name),
  );

  if (ranked.error !== null) {
    return { data: saved.data, error: null };
  }

  return { data: ranked.data, error: null };
}

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

      loadOrCreateAssessment(
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

import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { getCurrentUser } from "../services/authService";
import { createProgress, getProgress } from "../services/progressService";

export interface ProgressData {
  missions_completed: number;
  current_streak: number;
  career_readiness: number;
  last_completed: string | null;
}

export function useProgress() {
  const [loading, setLoading] = useState(true);

  const [progress, setProgress] = useState<ProgressData>({
    missions_completed: 0,
    current_streak: 0,
    career_readiness: 0,
    last_completed: null,
  });

  // True once the first load (success or failure) has completed — gates
  // whether a focus-triggered refresh below is allowed to show the
  // full-screen loading state again.
  const hasLoadedOnce = useRef(false);

  // Pure fetch, no state writes — reused by both the explicit reload below
  // and the silent focus-triggered refresh in useFocusEffect, so each
  // caller controls its own loading-state behavior around the same fetch.
  const fetchProgress = useCallback(async (): Promise<ProgressData | null> => {
    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      return null;
    }

    let { data } = await getProgress(user.id);

    if (!data) {
      await createProgress(user.id);

      const response = await getProgress(user.id);

      data = response.data;
    }

    return data;
  }, []);

  const loadProgress = useCallback(async () => {
    setLoading(true);

    const data = await fetchProgress();

    if (data) {
      setProgress(data);
    }

    setLoading(false);
    hasLoadedOnce.current = true;
  }, [fetchProgress]);

  // Refetched on every focus, not just on first mount — expo-router's Tabs
  // keep Dashboard mounted in the background, so a plain mount-only effect
  // would keep showing pre-completion streak/readiness numbers after Mission
  // Complete updates them elsewhere. Only the very first load shows the
  // full-screen loading state (dashboard.tsx replaces the whole screen while
  // `loading` is true); every later focus refreshes silently in the
  // background so returning to an already-loaded Home doesn't flash the
  // whole screen on every tab switch — the previously loaded numbers stay
  // on screen until the fresh ones arrive. The `active` guard discards a
  // response that resolves after a newer focus has already superseded it,
  // so a slow stale request can never overwrite a more recent one.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!hasLoadedOnce.current) {
        setLoading(true);
      }

      fetchProgress().then((data) => {
        if (!active) {
          return;
        }

        if (data) {
          setProgress(data);
        }

        setLoading(false);
        hasLoadedOnce.current = true;
      });

      return () => {
        active = false;
      };
    }, [fetchProgress]),
  );

  return {
    loading,
    progress,
    reloadProgress: loadProgress,
  };
}

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

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

  const loadProgress = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    let { data } = await getProgress(user.id);

    if (!data) {
      await createProgress(user.id);

      const response = await getProgress(user.id);

      data = response.data;
    }

    if (data) {
      setProgress(data);
    }

    setLoading(false);
  }, []);

  // Refetched on every focus, not just on first mount — expo-router's Tabs
  // keep Dashboard mounted in the background, so a plain mount-only effect
  // would keep showing pre-completion streak/readiness numbers after Mission
  // Complete updates them elsewhere. Mirrors the same fix already proven in
  // ai-coach.tsx for the identical class of staleness.
  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [loadProgress]),
  );

  return {
    loading,
    progress,
    reloadProgress: loadProgress,
  };
}

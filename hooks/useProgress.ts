import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return {
    loading,
    progress,
    reloadProgress: loadProgress,
  };
}

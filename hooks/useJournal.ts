import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getCurrentUser } from "../services/authService";
import { getJournal } from "../services/journalService";
import { JournalEntry } from "../types/journal";

export type { JournalEntry };

export function useJournal() {
  const [loading, setLoading] = useState(true);

  // True only when the fetch itself failed — distinct from a genuinely
  // empty journal, which is not an error.
  const [error, setError] = useState(false);

  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setError(false);

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await getJournal(user.id);

    if (fetchError) {
      setError(true);
    } else if (data) {
      setJournal(data);
    }

    setLoading(false);
  }, []);

  // Refetched on every focus, not just on first mount — expo-router's Tabs
  // keep this screen mounted in the background, so a plain mount-only effect
  // would keep showing a journal missing entries created elsewhere (e.g. a
  // mission just completed via Coach) until a full app reload. Mirrors the
  // same fix already proven in ai-coach.tsx for the identical class of
  // staleness. Query and ordering are untouched — still getJournal(user.id).
  useFocusEffect(
    useCallback(() => {
      loadJournal();
    }, [loadJournal]),
  );

  return {
    loading,
    error,
    journal,
    reloadJournal: loadJournal,
  };
}

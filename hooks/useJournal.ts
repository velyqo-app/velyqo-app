import { useCallback, useEffect, useState } from "react";

import { getCurrentUser } from "../services/authService";
import { getJournal } from "../services/journalService";
import { JournalEntry } from "../types/journal";

export type { JournalEntry };

export function useJournal() {
  const [loading, setLoading] = useState(true);

  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const loadJournal = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await getJournal(user.id);

    if (!error && data) {
      setJournal(data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  return {
    loading,
    journal,
    reloadJournal: loadJournal,
  };
}

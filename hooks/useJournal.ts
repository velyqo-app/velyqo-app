import { useCallback, useEffect, useState } from "react";

import { getCurrentUser } from "../services/authService";
import { getJournal } from "../services/journalService";

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  entry_type: string;
  created_at: string;
}

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

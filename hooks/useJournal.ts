import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { getCurrentUser } from "../services/authService";
import { getJournal } from "../services/journalService";
import { JournalEntry } from "../types/journal";

export type { JournalEntry };

interface JournalFetchResult {
  data: JournalEntry[] | null;

  // True only when the fetch itself failed — distinct from "no user" or a
  // genuinely empty journal, neither of which is an error.
  failed: boolean;
}

export function useJournal() {
  const [loading, setLoading] = useState(true);

  // True only when the fetch itself failed — distinct from a genuinely
  // empty journal, which is not an error.
  const [error, setError] = useState(false);

  const [journal, setJournal] = useState<JournalEntry[]>([]);

  // True once the first load (success or failure) has completed — gates
  // whether a focus-triggered refresh below is allowed to show the
  // full-screen loading state again.
  const hasLoadedOnce = useRef(false);

  // Pure fetch, no state writes — reused by both the explicit reload below
  // and the silent focus-triggered refresh in useFocusEffect, so each
  // caller controls its own loading/error-state behavior around the same
  // fetch. Query and ordering are untouched — still getJournal(user.id).
  const fetchJournal = useCallback(async (): Promise<JournalFetchResult> => {
    const {
      data: { user },
    } = await getCurrentUser();

    if (!user) {
      return { data: null, failed: false };
    }

    const { data, error: fetchError } = await getJournal(user.id);

    return { data: data ?? null, failed: Boolean(fetchError) };
  }, []);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setError(false);

    const { data, failed } = await fetchJournal();

    if (failed) {
      setError(true);
    } else if (data) {
      setJournal(data);
    }

    setLoading(false);
    hasLoadedOnce.current = true;
  }, [fetchJournal]);

  // Refetched on every focus, not just on first mount — expo-router's Tabs
  // keep this screen mounted in the background, so a plain mount-only effect
  // would keep showing a journal missing entries created elsewhere (e.g. a
  // mission just completed via Coach) until a full app reload. Only the
  // very first load shows the full-screen loading state; every later focus
  // refreshes silently in the background so returning to an already-loaded
  // Journal doesn't flash the whole screen away — the previously loaded
  // entries stay on screen until the fresh ones arrive. A background
  // refresh that fails leaves the existing journal and error state alone
  // (rather than replacing good, already-visible data with a full error
  // screen); only a first-load failure surfaces the error state. The
  // `active` guard discards a response that resolves after a newer focus
  // has already superseded it, so a slow stale request can never overwrite
  // a more recent one.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (!hasLoadedOnce.current) {
        setLoading(true);
        setError(false);
      }

      fetchJournal().then(({ data, failed }) => {
        if (!active) {
          return;
        }

        if (failed) {
          if (!hasLoadedOnce.current) {
            setError(true);
          }
        } else if (data) {
          setJournal(data);
          setError(false);
        }

        setLoading(false);
        hasLoadedOnce.current = true;
      });

      return () => {
        active = false;
      };
    }, [fetchJournal]),
  );

  return {
    loading,
    error,
    journal,
    reloadJournal: loadJournal,
  };
}

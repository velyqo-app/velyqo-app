import { useEffect, useRef, useState } from "react";

import { searchOccupations } from "../services/occupationService";
import { Occupation } from "../types/occupation";
import { useDebouncedValue } from "./useDebouncedValue";

const MIN_SEARCH_LENGTH = 2;

export function useOccupationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Occupation[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function performSearch() {
      if (debouncedQuery.length < MIN_SEARCH_LENGTH) {
        return;
      }

      const requestId = ++requestIdRef.current;

      setLoading(true);

      try {
        const occupations = await searchOccupations(debouncedQuery);

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setResults(occupations);
      } catch (error) {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        console.error("Occupation search failed:", error);
        setResults([]);
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    performSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Clear results outside the effect when the user deletes text.
  if (query.trim().length < MIN_SEARCH_LENGTH && results.length > 0) {
    return {
      query,
      setQuery,
      results: [],
      loading: false,
      clearSearch: () => {
        setQuery("");
        setResults([]);
        setLoading(false);
      },
    };
  }

  const clearSearch = () => {
    requestIdRef.current++;

    setQuery("");
    setResults([]);
    setLoading(false);
  };

  return {
    query,
    setQuery,
    results,
    loading,
    clearSearch,
  };
}
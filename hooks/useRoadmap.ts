import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { toCountryCode } from "../services/countryService";
import { RoadmapInput, buildRoadmap } from "../services/roadmapService";
import { Roadmap } from "../types/roadmap";
import { useProfile } from "./useProfile";

/**
 * Bump when the roadmap shape or generation logic changes, so cached roadmaps
 * built by an older version are discarded rather than rendered.
 */
// v2: generated titles no longer carry "Step 1 -" style prefixes, so roadmaps
// cached by v1 must be discarded rather than rendered with doubled numbering.
const CACHE_VERSION = "v2";

const CACHE_PREFIX = "velyqo:roadmap";

/** Small non-cryptographic hash — only needs to detect changed inputs. */
function hashInputs(input: RoadmapInput): string {
  const raw = [
    input.currentRole,
    input.currentOccupationId,
    input.currentSalary,
    input.targetRole,
    input.targetOccupationId,
    input.targetSalary,
    input.countryCode,
    input.purpose,
  ]
    .join("|")
    .toLowerCase();

  let hash = 0;

  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function cacheKey(input: RoadmapInput): string {
  return `${CACHE_PREFIX}:${CACHE_VERSION}:${hashInputs(input)}`;
}

async function readCache(key: string): Promise<Roadmap | null> {
  try {
    const raw = await AsyncStorage.getItem(key);

    return raw ? (JSON.parse(raw) as Roadmap) : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, roadmap: Roadmap): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(roadmap));
  } catch {
    // A cache write failure must never break the screen.
  }
}

/**
 * Loads the roadmap for the signed-in user's saved profile.
 *
 * Generation calls the AI, so results are cached against a hash of the inputs.
 * The same profile reuses its roadmap across restarts; editing the profile
 * produces a new key and regenerates.
 */
export function useRoadmap() {
  const { loading: profileLoading, userData } = useProfile();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  const [loading, setLoading] = useState(true);

  const {
    currentRole,
    currentOccupationId,
    currentSalary,
    targetRole,
    targetOccupationId,
    targetSalary,
    country,
    goal,
  } = userData;

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    // Without a target there is nothing to build a roadmap towards.
    if (!targetRole.trim()) {
      setRoadmap(null);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);

    const input: RoadmapInput = {
      currentRole,
      currentOccupationId,
      currentSalary: Number(currentSalary) || null,

      targetRole,
      targetOccupationId,
      targetSalary: Number(targetSalary) || null,

      countryCode: toCountryCode(country),
      country: country || null,
      purpose: goal || null,
    };

    const key = cacheKey(input);

    const load = async () => {
      const cached = await readCache(key);

      if (!active) {
        return;
      }

      if (cached) {
        setRoadmap(cached);
        setLoading(false);
        return;
      }

      try {
        const result = await buildRoadmap(input);

        if (!active) {
          return;
        }

        setRoadmap(result);
        setLoading(false);

        // Only worth caching once there is something to reuse.
        if (result.steps.length > 0) {
          await writeCache(key, result);
        }
      } catch {
        // buildRoadmap degrades internally; this is a final backstop.
        if (active) {
          setRoadmap(null);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [
    profileLoading,
    currentRole,
    currentOccupationId,
    currentSalary,
    targetRole,
    targetOccupationId,
    targetSalary,
    country,
    goal,
  ]);

  return {
    loading: profileLoading || loading,
    roadmap,
  };
}

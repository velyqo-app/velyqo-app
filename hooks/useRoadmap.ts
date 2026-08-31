import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { toCountryCode } from "../services/countryService";
import { assessDestination } from "../services/destinationAssessmentService";
import { checkSalaryConflict } from "../services/destinationResolutionService";
import {
  DestinationOverride,
  RoadmapInput,
  buildRoadmap,
} from "../services/roadmapService";
import { SalaryPriority } from "../types/careerContext";
import { Roadmap, RoadmapSalary } from "../types/roadmap";
import { useProfile } from "./useProfile";

/**
 * Bump when the Roadmap shape or generation logic changes, so cached
 * roadmaps built by an older version are discarded rather than rendered.
 */
// v6: Roadmap now carries alternativeCareers — a v5 entry predates it and
// must not be reused.
const CACHE_VERSION = "v6";

const ROADMAP_CACHE_PREFIX = "velyqo:roadmap";
const DECISION_CACHE_PREFIX = "velyqo:destination-decision";

/** Small non-cryptographic hash — only needs to detect changed inputs. */
function simpleHash(raw: string): string {
  let hash = 0;

  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function roadmapCacheKey(input: RoadmapInput): string {
  const raw = [
    input.currentRole,
    input.currentOccupationId,
    input.currentSalary,
    input.targetRole,
    input.targetOccupationId,
    input.targetSalary,
    input.countryCode,
    input.purpose,
    input.startingSituation,
    input.experienceLevel,
    input.educationLevel,
    [...input.skills].sort().join(","),
    input.targetTimeframe,

    // Without this, a "role"-priority and a "salary"-priority roadmap for
    // the same profile would collide on the same cache entry.
    input.destinationOverride?.title ?? "",
    input.destinationOverride?.priority ?? "",
  ]
    .join("|")
    .toLowerCase();

  return `${ROADMAP_CACHE_PREFIX}:${CACHE_VERSION}:${simpleHash(raw)}`;
}

/**
 * Deliberately narrower than the roadmap cache key — a salary-priority
 * decision only depends on the target role/salary/country, not on skills or
 * education, so picking a new skill later doesn't silently re-open a
 * question the user already answered.
 */
function decisionCacheKey(
  targetRole: string,
  targetOccupationId: string | null,
  targetSalary: number | null,
  countryCode: string | null,
): string {
  const raw = [targetRole, targetOccupationId, targetSalary, countryCode]
    .join("|")
    .toLowerCase();

  return `${DECISION_CACHE_PREFIX}:${CACHE_VERSION}:${simpleHash(raw)}`;
}

interface StoredDecision {
  priority: SalaryPriority;

  /** Null whenever priority is "role", or no candidate could be resolved. */
  resolvedTitle: string | null;
  resolvedOccupationId: string | null;

  explanation: string | null;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);

    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A cache write failure must never break the screen.
  }
}

async function loadOrBuildRoadmap(input: RoadmapInput): Promise<Roadmap> {
  const key = roadmapCacheKey(input);

  const cached = await readJson<Roadmap>(key);

  if (cached) {
    return cached;
  }

  const result = await buildRoadmap(input);

  // Only worth caching once there is something to reuse — an AI_UNAVAILABLE
  // result is never cached, so a plain retry naturally tries again fresh.
  if (result.steps.length > 0) {
    await writeJson(key, result);
  }

  return result;
}

function buildOverride(
  decision: StoredDecision,
  baseInput: Omit<RoadmapInput, "destinationOverride">,
): DestinationOverride | null {
  if (decision.priority === "role" || !decision.resolvedTitle) {
    return null;
  }

  return {
    title: decision.resolvedTitle,
    occupationId: decision.resolvedOccupationId,
    priority: decision.priority,
    requestedTitle: baseInput.targetRole,
    requestedSalary: baseInput.targetSalary,
    explanation: decision.explanation,
  };
}

export interface DestinationComparison {
  requestedTitle: string;
  requestedOccupationId: string | null;
  requestedSalary: number;

  /** Guaranteed present — this comparison only exists once a real conflict
   * has been confirmed against a verified band. */
  band: RoadmapSalary;

  /** Catalogue candidates first (real, verified to exist), then any
   * AI-suggested titles not already covered. May be empty — see
   * chooseDestination for how that degrades. */
  candidates: { title: string; occupationId: string | null }[];

  /** The AI's qualitative note, or null if that call was unavailable. */
  explanation: string | null;
}

/**
 * Loads the roadmap for the signed-in user's saved profile.
 *
 * Before generating, checks whether the requested target salary exceeds the
 * verified range for the requested target role. If it does, generation
 * pauses and `needsDecision`/`comparison` are populated instead, until
 * `chooseDestination` is called. The chosen destination — never a silent
 * substitution — then drives generation exactly the way a free-text target
 * already does.
 */
export function useRoadmap() {
  const { loading: profileLoading, userData } = useProfile();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  // Only populated when the user chose "both" — a second, independently
  // generated roadmap toward the resolved destination.
  const [alternateRoadmap, setAlternateRoadmap] = useState<Roadmap | null>(
    null,
  );

  const [comparison, setComparison] = useState<DestinationComparison | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [needsDecision, setNeedsDecision] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const {
    currentRole,
    currentOccupationId,
    currentSalary,
    targetRole,
    targetOccupationId,
    targetSalary,
    country,
    goal,
    startingSituation,
    experienceLevel,
    educationLevel,
    skills,
    targetTimeframe,
  } = userData;

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    // Without a target there is nothing to build a roadmap towards.
    if (!targetRole.trim()) {
      setRoadmap(null);
      setAlternateRoadmap(null);
      setComparison(null);
      setNeedsDecision(false);
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setNeedsDecision(false);
    setGenerationFailed(false);

    const numericTargetSalary = Number(targetSalary) || null;
    const countryCode = toCountryCode(country);

    const baseInput: Omit<RoadmapInput, "destinationOverride"> = {
      currentRole,
      currentOccupationId,
      currentSalary: Number(currentSalary) || null,

      targetRole,
      targetOccupationId,
      targetSalary: numericTargetSalary,

      countryCode,
      country: country || null,
      purpose: goal || null,

      startingSituation,
      experienceLevel,
      educationLevel,
      skills,
      targetTimeframe,
    };

    const generateForDecision = async (decision: StoredDecision) => {
      const override = buildOverride(decision, baseInput);

      if (decision.priority === "both") {
        const [primary, alternate] = await Promise.all([
          loadOrBuildRoadmap({ ...baseInput, destinationOverride: null }),
          loadOrBuildRoadmap({ ...baseInput, destinationOverride: override }),
        ]);

        if (!active) {
          return;
        }

        setRoadmap(primary);
        setAlternateRoadmap(alternate);
        setGenerationFailed(
          primary.steps.length === 0 && alternate.steps.length === 0,
        );
        setLoading(false);
        return;
      }

      const result = await loadOrBuildRoadmap({
        ...baseInput,
        destinationOverride: override,
      });

      if (!active) {
        return;
      }

      setRoadmap(result);
      setAlternateRoadmap(null);
      setGenerationFailed(result.steps.length === 0);
      setLoading(false);
    };

    const run = async () => {
      try {
        const dKey = decisionCacheKey(
          targetRole,
          targetOccupationId,
          numericTargetSalary,
          countryCode,
        );

        const storedDecision = await readJson<StoredDecision>(dKey);

        if (!active) {
          return;
        }

        if (storedDecision) {
          await generateForDecision(storedDecision);
          return;
        }

        const check = await checkSalaryConflict(
          targetRole,
          targetOccupationId,
          numericTargetSalary,
          countryCode,
        );

        if (!active) {
          return;
        }

        if (!check.conflict || !check.band) {
          // No verified conflict — including "we have no data to compare
          // against" — proceeds exactly as it always has. This is the
          // common case given today's catalogue.
          await generateForDecision({
            priority: "role",
            resolvedTitle: null,
            resolvedOccupationId: null,
            explanation: null,
          });
          return;
        }

        const assessment = await assessDestination({
          currentRole,
          requestedTargetRole: targetRole,
          requestedTargetSalary: numericTargetSalary as number,
          targetTimeframe,
          currency: check.band.currency,
          bandLow: check.band.low,
          bandHigh: check.band.high,
          bandDataType: check.band.dataType,
          bandConfidence: check.band.confidence,
          knownAdvancedRoles: check.advancedCandidates.map(
            (candidate) => candidate.title,
          ),
        });

        if (!active) {
          return;
        }

        const catalogueCandidates = check.advancedCandidates.map(
          (candidate) => ({
            title: candidate.title,
            occupationId: candidate.id,
          }),
        );

        const aiOnlyCandidates = (assessment?.candidateTitles ?? [])
          .filter(
            (title) =>
              !catalogueCandidates.some(
                (existing) =>
                  existing.title.trim().toLowerCase() ===
                  title.trim().toLowerCase(),
              ),
          )
          .map((title) => ({ title, occupationId: null }));

        setComparison({
          requestedTitle: targetRole,
          requestedOccupationId: targetOccupationId,
          requestedSalary: numericTargetSalary as number,
          band: check.band,
          candidates: [...catalogueCandidates, ...aiOnlyCandidates],
          explanation: assessment?.explanation ?? null,
        });

        setNeedsDecision(true);
        setLoading(false);
      } catch {
        // Every step above degrades internally; this is a final backstop.
        if (active) {
          setRoadmap(null);
          setAlternateRoadmap(null);
          setGenerationFailed(true);
          setLoading(false);
        }
      }
    };

    run();

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
    startingSituation,
    experienceLevel,
    educationLevel,
    skills,
    targetTimeframe,
    retryToken,
  ]);

  const chooseDestination = async (priority: SalaryPriority) => {
    if (!comparison) {
      return;
    }

    // No candidate from either the catalogue or the AI — there is nothing
    // concrete to resolve to, so every option degrades to keeping the
    // requested role rather than inventing a destination.
    const chosen = comparison.candidates[0] ?? null;

    const decision: StoredDecision = {
      priority,
      resolvedTitle: chosen && priority !== "role" ? chosen.title : null,
      resolvedOccupationId:
        chosen && priority !== "role" ? chosen.occupationId : null,
      explanation: comparison.explanation,
    };

    const dKey = decisionCacheKey(
      comparison.requestedTitle,
      comparison.requestedOccupationId,
      comparison.requestedSalary,
      toCountryCode(country),
    );

    await writeJson(dKey, decision);

    setNeedsDecision(false);
    setLoading(true);

    const numericTargetSalary = Number(targetSalary) || null;

    const baseInput: Omit<RoadmapInput, "destinationOverride"> = {
      currentRole,
      currentOccupationId,
      currentSalary: Number(currentSalary) || null,
      targetRole,
      targetOccupationId,
      targetSalary: numericTargetSalary,
      countryCode: toCountryCode(country),
      country: country || null,
      purpose: goal || null,
      startingSituation,
      experienceLevel,
      educationLevel,
      skills,
      targetTimeframe,
    };

    const override = buildOverride(decision, baseInput);

    if (decision.priority === "both") {
      const [primary, alternate] = await Promise.all([
        loadOrBuildRoadmap({ ...baseInput, destinationOverride: null }),
        loadOrBuildRoadmap({ ...baseInput, destinationOverride: override }),
      ]);

      setRoadmap(primary);
      setAlternateRoadmap(alternate);
      setGenerationFailed(
        primary.steps.length === 0 && alternate.steps.length === 0,
      );
      setLoading(false);
      return;
    }

    const result = await loadOrBuildRoadmap({
      ...baseInput,
      destinationOverride: override,
    });

    setRoadmap(result);
    setAlternateRoadmap(null);
    setGenerationFailed(result.steps.length === 0);
    setLoading(false);
  };

  /** Clears a stored decision so checkSalaryConflict runs again from
   * scratch — lets the user revisit a choice without editing their profile. */
  const reconsiderDestination = async () => {
    const dKey = decisionCacheKey(
      targetRole,
      targetOccupationId,
      Number(targetSalary) || null,
      toCountryCode(country),
    );

    try {
      await AsyncStorage.removeItem(dKey);
    } catch {
      // Non-fatal — worst case the same decision is read back next time.
    }

    setRetryToken((token) => token + 1);
  };

  /** A failed generation is never cached, so a plain re-run tries again. */
  const retryGeneration = () => {
    setRetryToken((token) => token + 1);
  };

  return {
    loading: profileLoading || loading,
    needsDecision,
    comparison,
    roadmap,
    alternateRoadmap,
    generationFailed,
    chooseDestination,
    reconsiderDestination,
    retryGeneration,
  };
}

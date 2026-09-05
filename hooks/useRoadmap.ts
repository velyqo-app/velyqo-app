import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

import { UserData } from "../context/UserContext";
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
 * Bump when the Roadmap shape, generation logic, or cache key shape changes,
 * so cached roadmaps built by an older version are discarded rather than
 * rendered.
 */
// v6: Roadmap now carries alternativeCareers — a v5 entry predates it and
// must not be reused.
// v7: Cache keys are now scoped by userId — a v6 entry has no user segment
// and must not be reused, since it could belong to a different account.
// v8: currentSalary dropped from the roadmap key (see roadmapCacheKey) — a v7
// entry was hashed with it included and must not be reused, or a stale entry
// from before this bump could be misread as still matching.
const CACHE_VERSION = "v8";

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

/**
 * `userId` scopes every cache entry to the signed-in account — without it,
 * two different users with a similar-enough profile on the same device
 * would hash to the same key and read/overwrite each other's cache.
 */
function roadmapCacheKey(input: RoadmapInput, userId: string | null): string {
  const raw = [
    input.currentRole,
    input.currentOccupationId,

    // Deliberately excluded: currentSalary affects display-side calculations
    // (SalaryGrowthCard, Profile's Blueprint) but not the roadmap's own step
    // content, so editing it from Profile must not look like a role change —
    // it must reuse the existing cached roadmap rather than invalidate it.
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

  return `${ROADMAP_CACHE_PREFIX}:${CACHE_VERSION}:${userId ?? "anon"}:${simpleHash(raw)}`;
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
  userId: string | null,
): string {
  const raw = [targetRole, targetOccupationId, targetSalary, countryCode]
    .join("|")
    .toLowerCase();

  return `${DECISION_CACHE_PREFIX}:${CACHE_VERSION}:${userId ?? "anon"}:${simpleHash(raw)}`;
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

async function loadOrBuildRoadmap(
  input: RoadmapInput,
  userId: string | null,
): Promise<Roadmap> {
  const key = roadmapCacheKey(input, userId);

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

/**
 * Read-only peek at an already-cached roadmap for this profile, or null when
 * none exists yet. Never builds or generates one — Career Timeline remains
 * the only place a roadmap is actually produced. Used by Today's Mission so
 * it can reflect a real roadmap step without ever triggering AI generation
 * itself.
 *
 * Reuses the exact cache-key logic `useRoadmap` itself uses, rather than a
 * second copy of it. If the user resolved a salary conflict, the roadmap
 * toward their resolved destination is preferred (it's the one they're
 * actually looking at in Timeline); otherwise the roadmap toward their
 * plain requested role is used.
 */
export async function findCachedRoadmap(
  userData: UserData,
): Promise<Roadmap | null> {
  const {
    userId,
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

  if (!targetRole.trim()) {
    return null;
  }

  const countryCode = toCountryCode(country);
  const numericTargetSalary = Number(targetSalary) || null;

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

  const decision = await readJson<StoredDecision>(
    decisionCacheKey(targetRole, targetOccupationId, numericTargetSalary, countryCode, userId),
  );

  const override = decision ? buildOverride(decision, baseInput) : null;

  if (override) {
    const overrideRoadmap = await readJson<Roadmap>(
      roadmapCacheKey({ ...baseInput, destinationOverride: override }, userId),
    );

    if (overrideRoadmap && overrideRoadmap.steps.length > 0) {
      return overrideRoadmap;
    }
  }

  const primaryRoadmap = await readJson<Roadmap>(
    roadmapCacheKey({ ...baseInput, destinationOverride: null }, userId),
  );

  return primaryRoadmap && primaryRoadmap.steps.length > 0
    ? primaryRoadmap
    : null;
}

/**
 * Read-only peek at the priority the user chose the last time a salary
 * conflict was resolved (Destination Decision), or null when no decision has
 * ever been stored for this target — i.e. no verified conflict was found, so
 * the question was never asked. Never triggers the conflict check itself;
 * Profile uses this purely for display, the same way findCachedRoadmap
 * reads roadmaps without ever building one.
 */
export async function getStoredPriority(
  userData: UserData,
): Promise<SalaryPriority | null> {
  const { userId, targetRole, targetOccupationId, targetSalary, country } =
    userData;

  if (!targetRole.trim()) {
    return null;
  }

  const decision = await readJson<StoredDecision>(
    decisionCacheKey(
      targetRole,
      targetOccupationId,
      Number(targetSalary) || null,
      toCountryCode(country),
      userId,
    ),
  );

  return decision?.priority ?? null;
}

/**
 * Explicitly clears the roadmap (and, when the target itself changed, the
 * Destination Decision) cached under `previousUserData` — the values from
 * immediately before a confirmed role change or an explicit "reconsider my
 * priority" action. Content-addressed caching already makes these entries
 * unreachable once `userData` reflects the new values (their keys simply
 * stop matching), but this removes them outright so nothing stale lingers
 * in storage and a future cache-key coincidence can't resurrect them.
 *
 * Must only be called *after* the user has explicitly confirmed the change
 * that makes `previousUserData` stale — never speculatively, and never for
 * an edit to a field that isn't part of either cache key (e.g. skills or
 * experience level, which are left to invalidate themselves naturally by
 * changing the roadmap key on their own).
 */
export async function invalidateCachedRoadmap(
  previousUserData: UserData,
  { alsoDecision }: { alsoDecision: boolean },
): Promise<void> {
  const {
    userId,
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
  } = previousUserData;

  const countryCode = toCountryCode(country);
  const numericTargetSalary = Number(targetSalary) || null;

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

  await AsyncStorage.removeItem(
    roadmapCacheKey({ ...baseInput, destinationOverride: null }, userId),
  );

  if (!alsoDecision) {
    return;
  }

  const dKey = decisionCacheKey(
    targetRole,
    targetOccupationId,
    numericTargetSalary,
    countryCode,
    userId,
  );

  const decision = await readJson<StoredDecision>(dKey);

  if (decision) {
    const override = buildOverride(decision, baseInput);

    if (override) {
      await AsyncStorage.removeItem(
        roadmapCacheKey({ ...baseInput, destinationOverride: override }, userId),
      );
    }

    await AsyncStorage.removeItem(dKey);
  }
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
  const {
    loading: profileLoading,
    error: profileError,
    userData,
    reloadProfile,
  } = useProfile();

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

  // Guards chooseDestination against a second choice made while the first is
  // still processing. A ref rather than state — see chooseDestination.
  const choosingRef = useRef(false);
  const [choosingDestination, setChoosingDestination] = useState(false);

  const {
    userId,
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

    // A profile that failed to load is not the same as "no target role" —
    // there is nothing reliable to build a roadmap from either way, but the
    // two must be shown distinctly rather than both falling into the same
    // empty state.
    if (profileError) {
      setRoadmap(null);
      setAlternateRoadmap(null);
      setComparison(null);
      setNeedsDecision(false);
      setLoading(false);
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
          loadOrBuildRoadmap({ ...baseInput, destinationOverride: null }, userId),
          loadOrBuildRoadmap(
            { ...baseInput, destinationOverride: override },
            userId,
          ),
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

      const result = await loadOrBuildRoadmap(
        {
          ...baseInput,
          destinationOverride: override,
        },
        userId,
      );

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
          userId,
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
    profileError,
    userId,
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
    // A ref, not state — it must block a second call made in the same
    // event-loop tick (e.g. two rapid taps on different options before the
    // first render commits), which state alone cannot do since state only
    // takes effect on the next render. Set before the first await so there
    // is no gap where a second call could still slip through.
    if (!comparison || choosingRef.current) {
      return;
    }

    choosingRef.current = true;
    setChoosingDestination(true);

    try {
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
        userId,
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
          loadOrBuildRoadmap({ ...baseInput, destinationOverride: null }, userId),
          loadOrBuildRoadmap(
            { ...baseInput, destinationOverride: override },
            userId,
          ),
        ]);

        setRoadmap(primary);
        setAlternateRoadmap(alternate);
        setGenerationFailed(
          primary.steps.length === 0 && alternate.steps.length === 0,
        );
        setLoading(false);
        return;
      }

      const result = await loadOrBuildRoadmap(
        {
          ...baseInput,
          destinationOverride: override,
        },
        userId,
      );

      setRoadmap(result);
      setAlternateRoadmap(null);
      setGenerationFailed(result.steps.length === 0);
      setLoading(false);
    } catch (error) {
      // Every other generation path degrades internally rather than
      // throwing; this is the backstop for a genuine transport/exception
      // failure so the screen never gets stuck loading indefinitely.
      console.warn("chooseDestination failed:", error);

      setGenerationFailed(true);
      setLoading(false);
    } finally {
      choosingRef.current = false;
      setChoosingDestination(false);
    }
  };

  /** Clears a stored decision so checkSalaryConflict runs again from
   * scratch — lets the user revisit a choice without editing their profile. */
  const reconsiderDestination = async () => {
    const dKey = decisionCacheKey(
      targetRole,
      targetOccupationId,
      Number(targetSalary) || null,
      toCountryCode(country),
      userId,
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
    profileError,
    retryProfile: reloadProfile,
    needsDecision,
    comparison,
    roadmap,
    alternateRoadmap,
    generationFailed,
    chooseDestination,
    choosingDestination,
    reconsiderDestination,
    retryGeneration,

    // The user's own stated preference — display-only, so the UI can show
    // it distinctly from the roadmap's estimated journey rather than
    // implying either is a guarantee of the other.
    targetTimeframe,
  };
}

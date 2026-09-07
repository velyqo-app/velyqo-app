import { UserData } from "../context/UserContext";
import { findCachedRoadmap } from "../hooks/useRoadmap";
import {
  missionFromCapabilityGap,
  selectPriorityCapabilityGap,
} from "./capabilityMissionService";
import { getCapabilityGaps } from "./capabilityGapService";
import { CareerStateSummary, summarizeCareerState } from "./careerStateRules";
import { getJournal } from "./journalService";
import { getProfile } from "./profileService";
import { getProgress } from "./progressService";
import {
  CareerState,
  CareerStateActiveMission,
} from "../types/careerState";
import { CapabilityGap } from "../types/capability";
import {
  EducationLevel,
  ExperienceLevel,
  TargetTimeframe,
} from "../types/careerContext";
import { Profile } from "../types/profile";

/**
 * Maps an already-fetched `profiles` row onto the shape findCachedRoadmap
 * expects. Deliberately a local, private duplicate of
 * aiContextService.ts's own (also private, unexported) toRoadmapLookupInput
 * — small and purely mechanical, not worth exporting/importing across
 * services for. Never re-fetches the profile; the caller already has the
 * row in hand.
 */
function toRoadmapLookupInput(profile: Profile, userId: string): UserData {
  return {
    userId,

    userType: profile.user_type || "",
    name: profile.full_name || "",
    goal: profile.goal || "",
    country: profile.country || "",

    currentRole: profile.current_role || "",
    currentOccupationId: profile.current_occupation_id || null,
    currentSalary: profile.current_salary ? profile.current_salary.toString() : "",

    targetRole: profile.target_role || "",
    targetOccupationId: profile.target_occupation_id || null,
    targetSalary: profile.target_salary ? profile.target_salary.toString() : "",

    startingSituation: (profile.starting_situation ||
      "") as UserData["startingSituation"],
    experienceLevel: (profile.experience_level ||
      "") as UserData["experienceLevel"],
    educationLevel: (profile.education_level || "") as UserData["educationLevel"],
    skills: profile.skills || [],
    targetTimeframe: (profile.target_timeframe ||
      "") as UserData["targetTimeframe"],

    profileLoaded: true,
  };
}

export type GetCareerStateResult =
  | { data: CareerState; error: null }
  | { data: null; error: string };

/**
 * Assembles VELYQO's current understanding of one user's career position —
 * read-only, deterministic, no AI call, no write, no new persisted entity.
 * Reuses existing, already-approved reads exactly as their own services
 * expose them:
 *
 * - profileService.getProfile          -> destination, profileContext
 * - progressService.getProgress        -> progress.missionsCompleted/currentStreak
 * - journalService.getJournal          -> progress.recentActivity
 * - capabilityGapService.getCapabilityGaps -> capabilities
 * - capabilityMissionService.selectPriorityCapabilityGap / missionFromCapabilityGap
 *   (pure, no I/O) -> focus, derived from the SAME capabilities array
 *   already read above — no second capability read, and deliberately NOT
 *   capabilityMissionService.selectCapabilityMission or
 *   capabilityPriorityService.applyPriorityRanking, since both of those
 *   can perform a (self-healing) write; this service must not write
 *   anything at all. See the Step 2 report for why a resulting
 *   priority_rank could rarely be non-contiguous here, and why that's an
 *   accepted, disclosed characteristic of a read-only service rather than
 *   something this function should fix by writing.
 * - useRoadmap.findCachedRoadmap        -> progress.journeyProgress (a
 *   read-only, already-cached-only peek — never generates a roadmap, the
 *   same call getAIContext already makes for the same purpose)
 *
 * "No target role" and "no capability assessment yet" are both honest,
 * non-error outcomes (never trigger generation): the former returns a
 * CareerState with every destination/profileContext field at its existing
 * ""/[] "not answered" convention; the latter returns `capabilities: []`
 * and `focus: { priorityCapabilityGap: null, activeMission: null }`.
 *
 * A genuine READ FAILURE (an actual returned error, never just "no row")
 * on any of profile/progress/journal/capabilities fails the whole call —
 * never silently substituted with an empty/zeroed value, which would
 * misrepresent "we don't know" as "we know it's empty". findCachedRoadmap
 * has no error channel of its own (by its existing design) and always
 * degrades to `journeyProgress: null`, exactly like every other consumer
 * of it already accepts.
 */
export async function getCareerState(
  userId: string,
): Promise<GetCareerStateResult> {
  const { data: profile, error: profileError } = await getProfile(userId);

  if (profileError) {
    console.warn("CareerState: profile read failed:", profileError.message);

    return {
      data: null,
      error: "We couldn't load your career state. Please try again.",
    };
  }

  // No profile row yet (a user who hasn't finished onboarding) is not an
  // error — same distinction useProfile/getAIContext already draw — but
  // unlike getAIContext (which returns null here), this contract's rule 1
  // requires an honest CareerState with an empty destination, not nothing
  // at all.
  const targetRole = (profile?.target_role ?? "").trim();
  const currentRole = (profile?.current_role ?? "").trim();

  const [progressResult, journalResult, capabilitiesResult, roadmap] =
    await Promise.all([
      getProgress(userId),
      getJournal(userId),
      // No target role -> no capability read at all, and never a trigger
      // for capability generation (that remains owned entirely by the
      // existing assessment flow, e.g. useCapabilityGaps).
      targetRole
        ? getCapabilityGaps(userId, targetRole)
        : Promise.resolve({ data: [] as CapabilityGap[], error: null }),
      profile && targetRole
        ? findCachedRoadmap(toRoadmapLookupInput(profile, userId))
        : Promise.resolve(null),
    ]);

  if (progressResult.error) {
    console.warn(
      "CareerState: progress read failed:",
      progressResult.error.message,
    );

    return {
      data: null,
      error: "We couldn't load your career state. Please try again.",
    };
  }

  if (journalResult.error) {
    console.warn(
      "CareerState: journal read failed:",
      journalResult.error.message,
    );

    return {
      data: null,
      error: "We couldn't load your career state. Please try again.",
    };
  }

  if (capabilitiesResult.error) {
    console.warn(
      "CareerState: capability gap read failed:",
      capabilitiesResult.error.message,
    );

    return {
      data: null,
      error: "We couldn't load your career state. Please try again.",
    };
  }

  const capabilities = capabilitiesResult.data ?? [];

  // Reuses the exact same deterministic selection Home's Tier 0 mission
  // lookup uses (capabilityMissionService) — never a new scoring/ranking
  // system, and never recalculated here.
  const priorityCapabilityGap = selectPriorityCapabilityGap(capabilities);

  const activeMission: CareerStateActiveMission | null = priorityCapabilityGap
    ? {
        mission: missionFromCapabilityGap(priorityCapabilityGap),
        capabilityGapId: priorityCapabilityGap.id,
        capabilityName: priorityCapabilityGap.capability_name,
      }
    : null;

  const careerState: CareerState = {
    destination: {
      currentRole,
      targetRole,
      targetTimeframe: (profile?.target_timeframe ??
        "") as TargetTimeframe | "",
    },

    profileContext: {
      experienceLevel: (profile?.experience_level ??
        "") as ExperienceLevel | "",
      educationLevel: (profile?.education_level ?? "") as EducationLevel | "",
      skills: profile?.skills ?? [],
    },

    capabilities,

    progress: {
      // A brand-new user has no progress row until they complete their
      // first mission (getProgress uses maybeSingle for exactly this) —
      // zeroed, not fabricated: this mirrors getAIContext's own
      // established "zeroed baseline" precedent for the identical case,
      // not a new convention invented here.
      missionsCompleted: progressResult.data?.missions_completed ?? 0,
      currentStreak: progressResult.data?.current_streak ?? 0,

      // Mirrors AIContext.journal — the full history, most-recent-first,
      // exactly as getJournal already orders it. No "recent N" cap exists
      // anywhere else in the app to match, so none is invented here.
      recentActivity: journalResult.data ?? [],

      journeyProgress: roadmap?.estimatedJourney ?? null,
    },

    focus: {
      priorityCapabilityGap,
      activeMission,
    },
  };

  return { data: careerState, error: null };
}

export type GetCareerStateWithSummaryResult =
  | { data: { state: CareerState; summary: CareerStateSummary }; error: null }
  | { data: null; error: string };

/**
 * Phase 9.1 Step 4 — the single composed entry point a future consumer
 * (the Step 9.2 Next Move Engine, in particular) is expected to actually
 * call: reads CareerState exactly once via getCareerState above, then
 * derives CareerStateSummary from that same object via
 * careerStateRules.summarizeCareerState (pure, no second read, no write).
 * Mirrors getAIContext()'s established shape — one async call returning
 * one fully composed result — rather than leaving every caller to hand-
 * chain getCareerState + summarizeCareerState itself.
 *
 * Preserves getCareerState's error behavior exactly: a genuine read
 * failure there (never just "no target role" or "no assessment yet",
 * both of which are honest, non-error CareerState content) propagates
 * here unchanged — never re-interpreted, never downgraded to an
 * empty/zeroed summary. Deterministic once the read completes: the same
 * already-fetched CareerState always produces the same CareerStateSummary
 * (see careerStateRules.ts).
 *
 * Returns `data: { state, summary }` rather than two sibling top-level
 * fields, matching this file's own `{ data, error }` convention (and every
 * other Phase 8/9 service's) rather than inventing a new outer shape only
 * for this function.
 */
export async function getCareerStateWithSummary(
  userId: string,
): Promise<GetCareerStateWithSummaryResult> {
  const result = await getCareerState(userId);

  if (result.error !== null) {
    return { data: null, error: result.error };
  }

  return {
    data: {
      state: result.data,
      summary: summarizeCareerState(result.data),
    },
    error: null,
  };
}

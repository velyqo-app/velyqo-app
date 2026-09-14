import { UserData } from "../context/UserContext";
import { findCachedRoadmap, getStoredPriority } from "../hooks/useRoadmap";
import { AIContext } from "../types/ai";
import { StartingSituation } from "../types/careerContext";
import { JournalEntry } from "../types/journal";
import { Profile } from "../types/profile";
import { Progress } from "../types/progress";
import { getCurrentUser } from "./authService";
import { getAllCapabilityGapsForUser } from "./capabilityGapService";
import { getAllCapabilityEvidenceForUser } from "./capabilityEvidenceService";
import {
  assembleCareerStandingBrief,
  CareerStandingBrief,
} from "./careerStandingBriefService";
import { fallbackMission, missionFromRoadmapStep } from "./careerMissionService";
import { getJournal } from "./journalService";
import { getMomentum } from "./momentumService";
import { getProfile } from "./profileService";
import { getProgress } from "./progressService";

/**
 * Maps an already-fetched `profiles` row onto the shape `findCachedRoadmap`
 * expects — the same fields useProfile's merge produces, rebuilt here rather
 * than shared because this runs outside a component/hook. Never re-fetches
 * the profile; the caller already has the row in hand.
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

/**
 * Phase 14 — assembles the Career Standing Brief for Coach, or null on any
 * read failure. Enrichment only: never thrown, never allowed to affect
 * whether getAIContext itself succeeds — a failure here is logged and
 * degrades to null, exactly like `roadmap` already can. Both underlying
 * reads (getAllCapabilityGapsForUser / getAllCapabilityEvidenceForUser) are
 * existing, unmodified, user-scoped bulk reads — no new query shape, no
 * per-capability read, no N+1.
 */
async function loadStandingBrief(
  userId: string,
  targetRole: string,
): Promise<CareerStandingBrief | null> {
  const [gapsResult, evidenceResult] = await Promise.all([
    getAllCapabilityGapsForUser(userId),
    getAllCapabilityEvidenceForUser(userId),
  ]);

  if (gapsResult.error || !gapsResult.data) {
    console.warn(
      "AIContext: capability gaps read failed for Career Standing Brief:",
      gapsResult.error,
    );
    return null;
  }

  if (evidenceResult.error || !evidenceResult.data) {
    console.warn(
      "AIContext: capability evidence read failed for Career Standing Brief:",
      evidenceResult.error,
    );
    return null;
  }

  return assembleCareerStandingBrief(
    targetRole,
    gapsResult.data,
    evidenceResult.data,
  );
}

export async function getAIContext(): Promise<AIContext | null> {
  const {
    data: { user },
  } = await getCurrentUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: progress }, { data: journal }] =
    await Promise.all([
      getProfile(user.id),
      getProgress(user.id),
      getJournal(user.id),
    ]);

  // Without a profile there is no career context to coach against, and the
  // caller falls back to a generic greeting.
  if (!profile) {
    return null;
  }

  // A brand-new user has no progress row until they complete their first
  // mission. Coach against a zeroed baseline rather than refusing to answer,
  // which is what returning null here used to cause.
  const resolvedProgress: Progress = (progress as Progress | null) ?? {
    user_id: user.id,
    missions_completed: 0,
    current_streak: 0,
    career_readiness: 0,
    last_completed: null,
  };

  const resolvedProfile = profile as Profile;

  const lookupInput = toRoadmapLookupInput(resolvedProfile, user.id);

  // Same authoritative source as Dashboard's Today's Mission: a read-only
  // peek at an already-cached roadmap, never a generation trigger. Tier 1
  // (real next step) when one exists, Tier 2 (deterministic fallback)
  // otherwise — so the AI's own context always matches what the user sees.
  // getStoredPriority is the same read-only peek Profile uses to display a
  // resolved Destination Decision — never triggers the conflict check itself.
  const [roadmap, priority, standingBrief] = await Promise.all([
    findCachedRoadmap(lookupInput),
    getStoredPriority(lookupInput),
    loadStandingBrief(user.id, resolvedProfile.target_role ?? ""),
  ]);

  const mission =
    roadmap && roadmap.steps.length > 0
      ? missionFromRoadmapStep(roadmap.steps[0])
      : fallbackMission(
          resolvedProfile.target_role ?? "",
          resolvedProfile.current_role ?? "",
          (resolvedProfile.starting_situation ?? "") as StartingSituation | "",
        );

  return {
    profile: resolvedProfile,

    progress: resolvedProgress,

    mission,

    momentum: getMomentum(resolvedProgress.current_streak),

    journal: (journal ?? []) as JournalEntry[],

    roadmap,

    priority,

    standingBrief,
  };
}

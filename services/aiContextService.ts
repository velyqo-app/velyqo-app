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
import {
  deriveMostRecentDirectionChange,
  reconstructCareerDirectionHistory,
  RecentDirectionChange,
} from "./careerDirectionHistoryService";
import {
  assembleCapabilityDevelopmentTimeline,
  deriveRecentCapabilityMilestones,
  RecentCapabilityMilestones,
} from "./capabilityDevelopmentTimelineService";
import { getCareerCheckins } from "./careerCheckinService";
import { getCareerCheckinConfirmations } from "./careerCheckinConfirmationService";
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

/**
 * Phase 15 — assembles the compact Career Direction History projection for
 * Coach (the most recent prior target-role destination only — never the
 * full episode history), or null on any read failure. Enrichment only:
 * never thrown, never allowed to affect whether getAIContext itself
 * succeeds — mirrors loadStandingBrief's own degrade-to-null shape exactly.
 * Every underlying read is an existing, unmodified, user-scoped bulk read —
 * no new query shape, no per-episode/per-checkin read, no N+1.
 */
async function loadDirectionChange(
  userId: string,
  targetRole: string,
  journal: JournalEntry[],
): Promise<RecentDirectionChange | null> {
  const [gapsResult, evidenceResult, checkinsResult, confirmationsResult] =
    await Promise.all([
      getAllCapabilityGapsForUser(userId),
      getAllCapabilityEvidenceForUser(userId),
      getCareerCheckins(userId),
      getCareerCheckinConfirmations(userId),
    ]);

  if (gapsResult.error || !gapsResult.data) {
    console.warn(
      "AIContext: capability gaps read failed for Career Direction History:",
      gapsResult.error,
    );
    return null;
  }

  if (evidenceResult.error || !evidenceResult.data) {
    console.warn(
      "AIContext: capability evidence read failed for Career Direction History:",
      evidenceResult.error,
    );
    return null;
  }

  if (checkinsResult.error || !checkinsResult.data) {
    console.warn(
      "AIContext: career checkins read failed for Career Direction History:",
      checkinsResult.error,
    );
    return null;
  }

  if (confirmationsResult.error || !confirmationsResult.data) {
    console.warn(
      "AIContext: career checkin confirmations read failed for Career Direction History:",
      confirmationsResult.error,
    );
    return null;
  }

  const history = reconstructCareerDirectionHistory(
    targetRole,
    journal,
    checkinsResult.data,
    confirmationsResult.data,
    gapsResult.data,
    evidenceResult.data,
  );

  return deriveMostRecentDirectionChange(history);
}

/**
 * Phase 16 — assembles the compact Capability Development Timeline
 * projection for Coach (the most recent reconstructed capability-status
 * milestones for the current target role only — never the full timeline),
 * or null on any read failure. Enrichment only: never thrown, never allowed
 * to affect whether getAIContext itself succeeds — mirrors loadStandingBrief/
 * loadDirectionChange's own degrade-to-null shape exactly. Exactly two
 * existing, unmodified, user-scoped bulk reads — no new query shape, no
 * per-capability read, no N+1. Deliberately not refactored to share
 * loadStandingBrief's own gaps/evidence reads — each loader stays
 * independently simple, matching the precedent Phase 15 already set.
 */
async function loadCapabilityMilestones(
  userId: string,
  targetRole: string,
): Promise<RecentCapabilityMilestones | null> {
  const [gapsResult, evidenceResult] = await Promise.all([
    getAllCapabilityGapsForUser(userId),
    getAllCapabilityEvidenceForUser(userId),
  ]);

  if (gapsResult.error || !gapsResult.data) {
    console.warn(
      "AIContext: capability gaps read failed for Capability Development Timeline:",
      gapsResult.error,
    );
    return null;
  }

  if (evidenceResult.error || !evidenceResult.data) {
    console.warn(
      "AIContext: capability evidence read failed for Capability Development Timeline:",
      evidenceResult.error,
    );
    return null;
  }

  const timeline = assembleCapabilityDevelopmentTimeline(
    targetRole,
    gapsResult.data,
    evidenceResult.data,
  );

  return deriveRecentCapabilityMilestones(timeline);
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

  const resolvedJournal = (journal ?? []) as JournalEntry[];

  // Same authoritative source as Dashboard's Today's Mission: a read-only
  // peek at an already-cached roadmap, never a generation trigger. Tier 1
  // (real next step) when one exists, Tier 2 (deterministic fallback)
  // otherwise — so the AI's own context always matches what the user sees.
  // getStoredPriority is the same read-only peek Profile uses to display a
  // resolved Destination Decision — never triggers the conflict check itself.
  const [roadmap, priority, standingBrief, directionChange, capabilityMilestones] =
    await Promise.all([
      findCachedRoadmap(lookupInput),
      getStoredPriority(lookupInput),
      loadStandingBrief(user.id, resolvedProfile.target_role ?? ""),
      loadDirectionChange(
        user.id,
        resolvedProfile.target_role ?? "",
        resolvedJournal,
      ),
      loadCapabilityMilestones(user.id, resolvedProfile.target_role ?? ""),
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

    journal: resolvedJournal,

    roadmap,

    priority,

    standingBrief,

    directionChange,

    capabilityMilestones,
  };
}

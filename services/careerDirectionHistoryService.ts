import {
  CareerCheckin,
  CareerCheckinReport,
} from "../types/careerCheckin";
import { CareerCheckinConfirmation } from "../types/careerCheckinConfirmation";
import { CapabilityEvidence, CapabilityGap, CapabilityStatus } from "../types/capability";
import { JournalEntry } from "../types/journal";

/**
 * Phase 15 — Career Direction History.
 *
 * Read-only, deterministic reconstruction of a user's target-role history
 * from data VELYQO already persists (career_journal, career_checkins,
 * career_checkin_confirmations, capability_gaps, capability_evidence). No
 * I/O, no AI call, no new persisted entity — the same "pure assembly over
 * already-fetched arrays" shape careerStandingBriefService.ts and
 * careerJourneyService.ts already establish.
 *
 * Every fact here is either a verbatim copy of a persisted field or a plain,
 * deterministic derivation from persisted fields. Nothing here infers WHY a
 * direction changed — see reasonRecorded on CareerDirectionEpisode.
 */

const PROFILE_EDIT_ENTRY_TYPE = "profile_edit";
const TARGET_ROLE_UPDATED_TITLE = "Target role updated";
const MISSION_COMPLETION_SOURCE = "mission_completion";
const PROFILE_SNAPSHOT_SOURCE = "profile_snapshot";

// Mirrors profileService.buildRoleChangeJournalDescription's own two fixed
// templates exactly — this file never writes journal entries, only reads
// them back, so it must parse precisely what that function (unmodified)
// produces. A description matching neither template is treated as
// unresolvable (see ChangePoint.newTargetRole below), never guessed at.
const CHANGED_FROM_TO = /^Changed target role from "(.*?)" to "(.*)"\.$/;
const SET_TO = /^Set target role to "(.*)"\.$/;

/** How a direction change was made. */
export type DirectionChangeSource = "profile_edit" | "checkin_target_change";

/**
 * Verbatim capability_gaps.status plus plain evidence counts, scoped to one
 * historical target role by exact target_role string match — no fuzzy or
 * semantic matching (see buildCapabilitySummaries below).
 */
export interface CareerDirectionCapabilityEvidence {
  capabilityName: string;
  /** Copied verbatim from capability_gaps.status — never recomputed here. */
  status: CapabilityStatus;
  missionEvidenceCount: number;
  selfReportedEvidenceCount: number;
}

/** One completed, no-longer-current destination in the user's history. */
export interface CareerDirectionEpisode {
  targetRole: string;

  /**
   * ISO timestamp this role became the target, or null when unrecorded —
   * always null for the oldest reconstructable episode, since no earlier
   * change event supplies a "from" timestamp for it. Never fabricated,
   * never backfilled from onboarding (onboarding writes no journal entry).
   */
  becameCurrentAt: string | null;

  /** ISO timestamp this role stopped being the target — always known; an
   * episode only exists because a later, genuine change event ended it. */
  stoppedBeingCurrentAt: string;

  /** How the change AWAY from this role was made. */
  changeSource: DirectionChangeSource;

  /**
   * The user's own words, verbatim, ONLY when changeSource is
   * "checkin_target_change" and the applied report's description was
   * non-empty. Always null for "profile_edit" (that flow has no reason
   * input) and null when the check-in description was empty after trim.
   */
  reasonRecorded: string | null;

  /**
   * Capabilities that accumulated evidence while this was the target role,
   * exact-string-matched to this episode's targetRole. Empty array when no
   * capability_gaps rows exist for this exact role text — never omitted,
   * never fuzzy-matched to a similarly-named role.
   */
  capabilities: CareerDirectionCapabilityEvidence[];
}

export interface CareerDirectionHistory {
  /** Oldest -> newest. Excludes the current target role. Repeated role text
   * produces separate entries, never merged. */
  episodes: CareerDirectionEpisode[];

  /** profiles.target_role, trimmed. Not itself an episode. */
  currentTargetRole: string;

  /**
   * ISO timestamp the current target role began — the date of the most
   * recent genuine change event that resolves into the live current target
   * role, whether or not that event produced a full episode (e.g. a
   * "Set target role to X" edit with no prior role produces no episode but
   * still genuinely dates when X began). Null when there is no such event
   * to anchor it: no target-role change has ever been recorded at all
   * (true onboarding, which writes no journal entry, is never fabricated
   * here), or the reconstructed chain doesn't connect to the live profile
   * (see `incomplete`), or currentTargetRole is empty.
   */
  currentTargetSince: string | null;

  /**
   * True when reconstruction found a genuine change event it could not
   * resolve into a valid episode (unparseable journal text, or a chain that
   * doesn't connect to the live profile). The history is still returned;
   * this only flags that it may be missing an episode.
   */
  incomplete: boolean;
}

/** Compact, Coach-facing projection of only the most recent prior
 * destination — see deriveMostRecentDirectionChange. Deliberately narrower
 * than CareerDirectionEpisode: drops selfReportedEvidenceCount and the raw
 * status literal, neither of which may reach the Coach prompt. */
export interface RecentDirectionChange {
  previousTargetRole: string;
  changedAt: string;
  changeSource: DirectionChangeSource;
  reasonRecorded: string | null;
  capabilitiesWithMissionEvidence: {
    capabilityName: string;
    missionEvidenceCount: number;
  }[];
}

/** Internal — one genuine, ordered target-role change event, before it has
 * been walked into episodes. Not exported: callers only ever see
 * CareerDirectionHistory/RecentDirectionChange. */
interface ChangePoint {
  date: string;
  /** null = the journal/check-in data could not be resolved into a role
   * name (see the two callers below) — contributes to `incomplete`, never a
   * fabricated role. */
  newTargetRole: string | null;
  /** null = unknown (a check-in change point, or an unparseable profile
   * edit). "" = explicitly no prior role ("Set target role to..."). */
  oldTargetRole: string | null;
  source: DirectionChangeSource;
  reason: string | null;
}

/**
 * Every genuine target-role change recorded as a direct Profile edit —
 * parsed only from the fixed "Target role updated" / "profile_edit"
 * template profileService.buildRoleChangeJournalDescription produces.
 * Anything else under that title/entry_type (a future wording change, a
 * corrupted row) yields an unresolvable change point rather than a guess.
 */
function collectProfileEditChangePoints(journal: JournalEntry[]): ChangePoint[] {
  return journal
    .filter(
      (entry) =>
        entry.entry_type === PROFILE_EDIT_ENTRY_TYPE &&
        entry.title === TARGET_ROLE_UPDATED_TITLE,
    )
    .map((entry): ChangePoint => {
      const description = entry.description ?? "";

      const changedMatch = description.match(CHANGED_FROM_TO);
      if (changedMatch) {
        return {
          date: entry.created_at,
          newTargetRole: changedMatch[2].trim() || null,
          oldTargetRole: changedMatch[1].trim(),
          source: "profile_edit",
          reason: null,
        };
      }

      const setMatch = description.match(SET_TO);
      if (setMatch) {
        return {
          date: entry.created_at,
          newTargetRole: setMatch[1].trim() || null,
          // Explicitly "no prior role" — a fact, not a gap. Distinguished
          // from `null` (unknown) throughout the reconstruction walk.
          oldTargetRole: "",
          source: "profile_edit",
          reason: null,
        };
      }

      return {
        date: entry.created_at,
        newTargetRole: null,
        oldTargetRole: null,
        source: "profile_edit",
        reason: null,
      };
    });
}

/**
 * Every genuine target-role change reported through a Career Check-in —
 * ONLY where the corresponding decision was confirmed/edited AND its
 * applyStatus is "applied". A check-in report by itself (even one summarized
 * in the check-in's own "checkin" journal entry) is never treated as proof
 * the role actually changed — declined/unresolved decisions, or ones never
 * applied, produce no change point at all.
 */
function collectCheckinChangePoints(
  checkins: CareerCheckin[],
  confirmations: CareerCheckinConfirmation[],
): ChangePoint[] {
  const confirmationByCheckinId = new Map<string, CareerCheckinConfirmation>();
  for (const confirmation of confirmations) {
    confirmationByCheckinId.set(confirmation.checkin_id, confirmation);
  }

  const points: ChangePoint[] = [];

  for (const checkin of checkins) {
    const confirmation = confirmationByCheckinId.get(checkin.id);
    if (!confirmation) {
      continue;
    }

    checkin.reports.forEach((report: CareerCheckinReport, reportIndex: number) => {
      if (report.category !== "target_change") {
        return;
      }

      const decision = confirmation.decisions.find(
        (d) => d.reportIndex === reportIndex,
      );

      if (!decision) {
        return;
      }

      if (
        (decision.decision !== "confirmed" && decision.decision !== "edited") ||
        decision.applyStatus !== "applied"
      ) {
        return;
      }

      const newTargetRole = decision.appliedValue?.trim() || null;
      const reason = report.description.trim() || null;

      // completed_at is only set once EVERY decision in the confirmation is
      // applied and its journal entry exists — a sibling decision in the
      // same confirmation can leave it null even though this decision is
      // genuinely applied. created_at (the confirmation was saved) is the
      // honest fallback: still a real, persisted timestamp for this
      // decision, never a fabricated one.
      const date = confirmation.completed_at ?? confirmation.created_at;

      points.push({
        date,
        newTargetRole,
        oldTargetRole: null,
        source: "checkin_target_change",
        reason,
      });
    });
  }

  return points;
}

/**
 * Groups every capability_gaps row by its trimmed target_role, and counts
 * capability_evidence rows per gap by source_type — both built once, up
 * front, so per-episode lookups below are O(1) map reads rather than
 * repeated scans over the full arrays (no N+1).
 */
function indexCapabilities(
  allGaps: CapabilityGap[],
  allEvidence: CapabilityEvidence[],
): {
  gapsByRole: Map<string, CapabilityGap[]>;
  evidenceCountsByGapId: Map<string, { mission: number; selfReported: number }>;
} {
  const gapsByRole = new Map<string, CapabilityGap[]>();
  for (const gap of allGaps) {
    const key = gap.target_role.trim();
    const existing = gapsByRole.get(key);
    if (existing) {
      existing.push(gap);
    } else {
      gapsByRole.set(key, [gap]);
    }
  }

  const evidenceCountsByGapId = new Map<
    string,
    { mission: number; selfReported: number }
  >();
  for (const row of allEvidence) {
    const counts = evidenceCountsByGapId.get(row.capability_gap_id) ?? {
      mission: 0,
      selfReported: 0,
    };

    if (row.source_type === MISSION_COMPLETION_SOURCE) {
      counts.mission += 1;
    } else if (row.source_type === PROFILE_SNAPSHOT_SOURCE) {
      counts.selfReported += 1;
    }

    evidenceCountsByGapId.set(row.capability_gap_id, counts);
  }

  return { gapsByRole, evidenceCountsByGapId };
}

/**
 * Capabilities for one historical episode — exact-string target-role match
 * only (the same convention careerStandingBriefService/
 * capabilityEvidenceTrailService already use). No cross-role fuzzy or
 * semantic matching. `status` is copied verbatim from capability_gaps —
 * never recomputed.
 */
function buildCapabilitySummaries(
  targetRole: string,
  gapsByRole: Map<string, CapabilityGap[]>,
  evidenceCountsByGapId: Map<string, { mission: number; selfReported: number }>,
): CareerDirectionCapabilityEvidence[] {
  const gaps = gapsByRole.get(targetRole.trim()) ?? [];

  return gaps
    .map((gap): CareerDirectionCapabilityEvidence => {
      const counts = evidenceCountsByGapId.get(gap.id) ?? {
        mission: 0,
        selfReported: 0,
      };

      return {
        capabilityName: gap.capability_name,
        status: gap.status,
        missionEvidenceCount: counts.mission,
        selfReportedEvidenceCount: counts.selfReported,
      };
    })
    .sort((a, b) => a.capabilityName.localeCompare(b.capabilityName));
}

/**
 * Pure assembly — given a user's already-fetched career_journal,
 * career_checkins, career_checkin_confirmations, capability_gaps and
 * capability_evidence, plus their LIVE current target role, returns the
 * full deterministic CareerDirectionHistory. No I/O; the same inputs always
 * produce the same output.
 *
 * Algorithm (see the Phase 15 design for the full write-up):
 * 1. Collect every genuine change point from profile edits and applied
 *    check-in target changes.
 * 2. Sort them chronologically — the only ordering signal used.
 * 3. Walk oldest -> newest carrying a "cursor" (the role active just before
 *    each change point), emitting one episode per step where the cursor is
 *    known and non-empty. Repeated role text is never merged — two stints
 *    at the same role are always two separate episodes.
 * 4. If the final cursor disagrees with the live current target role, flag
 *    `incomplete` rather than fabricate a bridging episode — the live
 *    profile always remains the source of truth for `currentTargetRole`.
 */
export function reconstructCareerDirectionHistory(
  currentTargetRole: string,
  journal: JournalEntry[],
  checkins: CareerCheckin[],
  confirmations: CareerCheckinConfirmation[],
  allGaps: CapabilityGap[],
  allEvidence: CapabilityEvidence[],
): CareerDirectionHistory {
  const trimmedCurrentTargetRole = currentTargetRole.trim();

  const changePoints = [
    ...collectProfileEditChangePoints(journal),
    ...collectCheckinChangePoints(checkins, confirmations),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (changePoints.length === 0) {
    return {
      episodes: [],
      currentTargetRole: trimmedCurrentTargetRole,
      currentTargetSince: null,
      incomplete: false,
    };
  }

  const { gapsByRole, evidenceCountsByGapId } = indexCapabilities(
    allGaps,
    allEvidence,
  );

  const firstPoint = changePoints[0];
  let cursor: string | null =
    firstPoint.oldTargetRole !== null && firstPoint.oldTargetRole !== ""
      ? firstPoint.oldTargetRole
      : null;
  // Always null at the start: even a known origin role's OWN start date is
  // unrecorded (we only know it ended at firstPoint.date) — see
  // CareerDirectionEpisode.becameCurrentAt.
  let cursorSince: string | null = null;

  const episodes: CareerDirectionEpisode[] = [];
  let incomplete = false;

  for (const point of changePoints) {
    if (cursor !== null && cursor !== "") {
      episodes.push({
        targetRole: cursor,
        becameCurrentAt: cursorSince,
        stoppedBeingCurrentAt: point.date,
        changeSource: point.source,
        reasonRecorded: point.reason,
        capabilities: buildCapabilitySummaries(
          cursor,
          gapsByRole,
          evidenceCountsByGapId,
        ),
      });
    }

    if (point.newTargetRole === null) {
      incomplete = true;
    }

    cursor = point.newTargetRole;
    cursorSince = point.date;
  }

  // Whether the walk's final cursor genuinely IS the live current target
  // role — the only condition under which cursorSince honestly means "the
  // date the current target role began". A mismatch (or an unresolvable
  // final cursor) never fabricates a start date; it only sets `incomplete`.
  const cursorMatchesLiveProfile =
    trimmedCurrentTargetRole !== "" &&
    cursor !== null &&
    cursor.trim() === trimmedCurrentTargetRole;

  if (trimmedCurrentTargetRole !== "" && !cursorMatchesLiveProfile) {
    incomplete = true;
  }

  return {
    episodes,
    currentTargetRole: trimmedCurrentTargetRole,
    currentTargetSince: cursorMatchesLiveProfile ? cursorSince : null,
    incomplete,
  };
}

/**
 * Narrows a full CareerDirectionHistory down to Coach's compact,
 * most-recent-only projection — the ONLY shape of this data that may ever
 * reach AIContext/the Coach prompt. The full `episodes[]` array is
 * deliberately never passed through.
 */
export function deriveMostRecentDirectionChange(
  history: CareerDirectionHistory,
): RecentDirectionChange | null {
  if (history.episodes.length === 0) {
    return null;
  }

  const mostRecent = history.episodes[history.episodes.length - 1];

  return {
    previousTargetRole: mostRecent.targetRole,
    changedAt: mostRecent.stoppedBeingCurrentAt,
    changeSource: mostRecent.changeSource,
    reasonRecorded: mostRecent.reasonRecorded,
    capabilitiesWithMissionEvidence: mostRecent.capabilities
      .filter((capability) => capability.missionEvidenceCount > 0)
      .map((capability) => ({
        capabilityName: capability.capabilityName,
        missionEvidenceCount: capability.missionEvidenceCount,
      })),
  };
}

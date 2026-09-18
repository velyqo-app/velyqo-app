import { reconstructCapabilityMilestones } from "./capabilityAchievementService";
import { CapabilityEvidence, CapabilityGap, CapabilityStatus } from "../types/capability";
import { CapabilityEvidenceTrailItem } from "../types/capabilityEvidenceTrail";

/**
 * Phase 16 — Capability Development Timeline.
 *
 * Read-only, deterministic reconstruction of WHEN each current-target
 * capability reached a "developing"/"strength" milestone — built entirely
 * from data already fetched elsewhere (capability_gaps, capability_evidence)
 * and Phase 13's own, UNMODIFIED milestone-replay logic
 * (capabilityAchievementService.reconstructCapabilityMilestones), applied
 * once per current-target capability instead of once per UI click, then
 * flattened into one ordered list. No I/O, no AI call, no new persisted
 * entity, no second status/milestone system.
 *
 * Every milestone here is an INDEPENDENT, dated fact. This file never
 * computes, stores, or exposes any elapsed-time/gap-between-milestones
 * value — not even internally — and never orders or words two different
 * capabilities' milestones as though one relates to, follows from, or
 * explains another. See promptBuilderService.ts's own wording rules for
 * the enforced, connector-word-free phrasing this feeds.
 */

const MISSION_COMPLETION_SOURCE = "mission_completion";

/** One reconstructed status milestone for one current-target capability.
 * "unknown"/"priority_gap" are never reachable here — only the two states
 * reconstructCapabilityMilestones can actually replay into. */
export interface CapabilityMilestoneEvent {
  capabilityName: string;
  milestone: "developing" | "strength";
  /** Verbatim capability_evidence.created_at of the evidence event that
   * first produced this milestone under the existing, unmodified rule. */
  reachedAt: string;
}

/** One current-target capability's full reconstructed picture. */
export interface CapabilityDevelopmentRecord {
  capabilityName: string;
  /** capability_gaps.status, verbatim — never recomputed here. */
  currentStatus: CapabilityStatus;
  /** Verbatim earliest capability_evidence.created_at, or null with no
   * evidence at all. NOT a milestone — evidence merely existing is not a
   * state change VELYQO can factually claim as "reached." Never included
   * in `events` below, and never sent to Coach. */
  firstEvidenceDate: string | null;
  developingAt: string | null;
  strengthAt: string | null;
}

export interface CapabilityDevelopmentTimeline {
  /** profile.target_role, trimmed. */
  targetRole: string;

  /** One record per current-target capability_gaps row, including
   * capabilities with zero evidence (an honest, all-null record — never
   * omitted). Sorted by capabilityName for a stable read. */
  capabilities: CapabilityDevelopmentRecord[];

  /** Every developing/strength milestone across `capabilities`, flattened
   * and sorted oldest -> newest (ties broken by capabilityName for
   * determinism). firstEvidenceDate is deliberately never an event here. */
  events: CapabilityMilestoneEvent[];
}

/** Compact, Coach-facing projection — the ONLY shape of this data that may
 * ever reach AIContext/the Coach prompt. The full `capabilities[]`/
 * `events[]` are deliberately never passed through. */
export interface RecentCapabilityMilestones {
  targetRole: string;

  /** The most recent `limit` milestone events, newest first. Each entry is
   * an independent fact — no elapsed-time field, no relationship or
   * ordering narrative implied between entries. */
  recentMilestones: CapabilityMilestoneEvent[];
}

const EMPTY_TIMELINE: CapabilityDevelopmentTimeline = {
  targetRole: "",
  capabilities: [],
  events: [],
};

/**
 * Pure assembly — given a user's already-fetched capability_gaps (every
 * target role they've ever had) and capability_evidence (every row, every
 * source_type), plus their current target role, returns the full
 * deterministic CapabilityDevelopmentTimeline. No I/O; the same inputs
 * always produce the same output.
 *
 * Current-target scoping is exact-string-match only (the same convention
 * careerStandingBriefService/careerDirectionHistoryService/
 * capabilityEvidenceTrailService.isCurrentTargetRole already use) — no
 * fuzzy matching, no cross-role name comparison, no cross-role timeline.
 *
 * Reuses capabilityAchievementService.reconstructCapabilityMilestones
 * UNMODIFIED as the sole source of milestone dates — this file only builds
 * the lightweight, synthetic per-capability evidence trail that function
 * expects (only its `date`/`provenance` fields are ever read by that
 * replay) directly from already-bulk-fetched rows, and flattens the result
 * across every current-target capability. capabilityAchievementService.ts
 * itself is never changed.
 */
export function assembleCapabilityDevelopmentTimeline(
  targetRole: string,
  allGaps: CapabilityGap[],
  allEvidence: CapabilityEvidence[],
): CapabilityDevelopmentTimeline {
  const trimmedTargetRole = targetRole.trim();

  if (!trimmedTargetRole) {
    return EMPTY_TIMELINE;
  }

  const currentRoleGaps = allGaps
    .filter((gap) => gap.target_role.trim() === trimmedTargetRole)
    .slice()
    .sort((a, b) => a.capability_name.localeCompare(b.capability_name));

  if (currentRoleGaps.length === 0) {
    return { ...EMPTY_TIMELINE, targetRole: trimmedTargetRole };
  }

  const currentRoleGapIds = new Set(currentRoleGaps.map((gap) => gap.id));

  // Evidence rows carry no target_role of their own — scoping requires
  // joining through the current-target-role gap ids above, not a direct
  // filter on the evidence row itself. Grouped once, up front, rather than
  // re-scanned per gap (no N+1).
  const evidenceByGapId = new Map<string, CapabilityEvidence[]>();
  for (const row of allEvidence) {
    if (!currentRoleGapIds.has(row.capability_gap_id)) {
      continue;
    }

    const existing = evidenceByGapId.get(row.capability_gap_id);
    if (existing) {
      existing.push(row);
    } else {
      evidenceByGapId.set(row.capability_gap_id, [row]);
    }
  }

  // reconstructCapabilityMilestones assumes oldest-first input.
  for (const rows of evidenceByGapId.values()) {
    rows.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  }

  const capabilities: CapabilityDevelopmentRecord[] = [];
  const events: CapabilityMilestoneEvent[] = [];

  for (const gap of currentRoleGaps) {
    const rows = evidenceByGapId.get(gap.id) ?? [];

    // Only `date`/`provenance` are ever read by reconstructCapabilityMilestones
    // — `note`/`sourceReference` are populated only to satisfy the shared
    // type, never inspected by that replay.
    const trailItems: CapabilityEvidenceTrailItem[] = rows.map((row) => ({
      id: row.id,
      date: row.created_at,
      provenance:
        row.source_type === MISSION_COMPLETION_SOURCE ? "velyqo_verified" : "you_reported",
      note: row.note ?? "",
      sourceReference: null,
    }));

    const milestones = reconstructCapabilityMilestones(trailItems);

    capabilities.push({
      capabilityName: gap.capability_name,
      currentStatus: gap.status,
      firstEvidenceDate: milestones.firstEvidenceDate,
      developingAt: milestones.developingAt,
      strengthAt: milestones.strengthAt,
    });

    if (milestones.developingAt !== null) {
      events.push({
        capabilityName: gap.capability_name,
        milestone: "developing",
        reachedAt: milestones.developingAt,
      });
    }

    if (milestones.strengthAt !== null) {
      events.push({
        capabilityName: gap.capability_name,
        milestone: "strength",
        reachedAt: milestones.strengthAt,
      });
    }
  }

  events.sort((a, b) => {
    if (a.reachedAt !== b.reachedAt) {
      return a.reachedAt < b.reachedAt ? -1 : 1;
    }
    return a.capabilityName.localeCompare(b.capabilityName);
  });

  return {
    targetRole: trimmedTargetRole,
    capabilities,
    events,
  };
}

const DEFAULT_RECENT_LIMIT = 3;

/**
 * Narrows a full CapabilityDevelopmentTimeline down to Coach's compact,
 * most-recent-only projection — the ONLY shape of this data that may ever
 * reach AIContext/the Coach prompt. The full `capabilities[]`/`events[]`
 * are deliberately never passed through, and no elapsed-time value is
 * computed here or anywhere else in this file.
 */
export function deriveRecentCapabilityMilestones(
  timeline: CapabilityDevelopmentTimeline,
  limit: number = DEFAULT_RECENT_LIMIT,
): RecentCapabilityMilestones | null {
  if (timeline.events.length === 0) {
    return null;
  }

  const recentMilestones = timeline.events.slice(-limit).reverse();

  return {
    targetRole: timeline.targetRole,
    recentMilestones,
  };
}

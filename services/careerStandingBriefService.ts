import { selectPriorityCapabilityGap } from "./capabilityMissionService";
import { CapabilityEvidence, CapabilityGap } from "../types/capability";

/**
 * Phase 14 — Career Standing Intelligence.
 *
 * Read-only, deterministic, current-target-role-only summary of "where does
 * this person's career stand right now, per VELYQO's own accumulated
 * capability/evidence records" — built entirely from data already fetched
 * elsewhere in the app (capability_gaps, capability_evidence). No I/O, no AI
 * call, no new persisted entity, no second status/priority system: this file
 * imports and reuses capabilityMissionService.selectPriorityCapabilityGap
 * UNMODIFIED (the exact same Tier 0 selection NextMove/Home already use) and
 * never reinterprets capability_gaps.status, which remains the single
 * authority (capabilityStatusService).
 *
 * Deliberately small: this is Coach's context, not a database export. See
 * the Phase 14 Step 2 design for the fields considered and rejected.
 */

const MISSION_COMPLETION_SOURCE = "mission_completion";

/**
 * One current-target-role capability with at least one mission_completion
 * evidence event. `status` is always a verbatim copy of
 * capability_gaps.status — never reinterpreted, and (see
 * assembleCareerStandingBrief below) only ever "developing" or "strength"
 * here, since a capability with mission evidence but a status recalculation
 * still pending (a disclosed, self-healing possibility elsewhere in this
 * codebase — see capabilityStatusService/mission-complete.tsx) is honestly
 * omitted rather than mislabeled.
 *
 * "strength" here means the underlying capability_gaps row currently holds
 * that status — which itself only ever means two or more mission_completion
 * evidence events for that capability (capabilityStatusService
 * .computeStatusFromEvidence's own ceiling). It does NOT mean the two
 * missions were independent real-world proof, and it must never be rendered
 * to the user as "verified," "certified," or "proven" — see
 * promptBuilderService.ts's own Career Standing section for the enforced
 * wording.
 */
export interface CareerStandingCapability {
  capabilityName: string;
  status: "developing" | "strength";
}

/**
 * VELYQO's compact, current-target-role-only "career standing" summary —
 * everything below is either a direct copy of a persisted field or a plain,
 * deterministic derivation from persisted fields. Never a score, never a
 * percentage, never AI-generated.
 */
export interface CareerStandingBrief {
  /** profile.target_role, trimmed. Every other field is meaningless when
   * this is "" (no target role set yet) — a genuinely empty brief, not an
   * error. */
  targetRole: string;

  /** The same single capability capabilityMissionService
   * .selectPriorityCapabilityGap already selects for Home/NextMove's Tier 0
   * — never a second ranking or a second opinion. Null when no priority_gap
   * capability currently exists for this target role. */
  currentPriorityCapability: {
    capabilityName: string;

    /** capability_gaps.created_at for that row, verbatim (ISO timestamp) —
     * the date VELYQO's current, continuous priority-gap record for this
     * capability began. Safe to treat as exactly that (see the Phase 14
     * Step 2 design's inspection of capabilityStatusService/
     * capabilityPriorityService/capabilityPersistenceService: no code path
     * anywhere transitions a row INTO "priority_gap" after creation, or
     * rewrites created_at, so a row currently "priority_gap" has been that
     * continuously since this timestamp). This is NOT a measure of time
     * spent working on it, struggling, or being "behind" — only the date
     * this specific persistent record began. Callers must render it
     * neutrally.
     */
    priorityGapSince: string;
  } | null;

  /** Every current-target-role capability with at least one
   * mission_completion evidence event. Small by construction (a target
   * role has 6-10 capability_gaps rows total per
   * capabilityGenerationService's own contract) — never capped further,
   * and never a substitute for the full per-capability evidence trail
   * (capabilityEvidenceTrailService), which remains the only place that
   * detail belongs. Sorted by capability name for a stable, readable
   * prompt rendering (capability_gaps has no natural read order of its
   * own here — getAllCapabilityGapsForUser does not order its result). */
  capabilitiesWithMissionEvidence: CareerStandingCapability[];

  /** The most recent mission_completion evidence event's created_at, across
   * every current-target-role capability — null when none exist yet. Never
   * includes profile_snapshot (self-reported) evidence, and never evidence
   * belonging to a prior target role. */
  latestMissionEvidenceDate: string | null;
}

const EMPTY_BRIEF: CareerStandingBrief = {
  targetRole: "",
  currentPriorityCapability: null,
  capabilitiesWithMissionEvidence: [],
  latestMissionEvidenceDate: null,
};

/**
 * Pure assembly — given a user's already-fetched capability_gaps (every
 * target role they've ever had) and capability_evidence (every row, every
 * source_type), returns the current-target-role-only Career Standing
 * Brief. No I/O, deterministic: the same inputs always produce the same
 * output.
 *
 * Current-target-role scoping is exact-string-match only (the same
 * convention capabilityEvidenceTrailService.isCurrentTargetRole already
 * uses) — no fuzzy matching, no cross-role name comparison. A capability
 * (and its evidence) from a previous target role is excluded entirely, even
 * if its name closely resembles a current one; historical Career Story /
 * Capability Evidence behaviour is untouched by this file and remains the
 * only place historical standing is shown.
 */
export function assembleCareerStandingBrief(
  targetRole: string,
  allGaps: CapabilityGap[],
  allEvidence: CapabilityEvidence[],
): CareerStandingBrief {
  const trimmedTargetRole = targetRole.trim();

  if (!trimmedTargetRole) {
    return EMPTY_BRIEF;
  }

  const currentRoleGaps = allGaps.filter(
    (gap) => gap.target_role.trim() === trimmedTargetRole,
  );

  if (currentRoleGaps.length === 0) {
    return { ...EMPTY_BRIEF, targetRole: trimmedTargetRole };
  }

  const currentRoleGapIds = new Set(currentRoleGaps.map((gap) => gap.id));

  // Evidence rows carry no target_role of their own — scoping requires
  // joining through the current-target-role gap ids above, not a direct
  // filter on the evidence row itself.
  const currentRoleMissionEvidence = allEvidence.filter(
    (row) =>
      row.source_type === MISSION_COMPLETION_SOURCE &&
      currentRoleGapIds.has(row.capability_gap_id),
  );

  const missionEvidenceCountByGapId = new Map<string, number>();

  for (const row of currentRoleMissionEvidence) {
    missionEvidenceCountByGapId.set(
      row.capability_gap_id,
      (missionEvidenceCountByGapId.get(row.capability_gap_id) ?? 0) + 1,
    );
  }

  // Reused verbatim — the exact same Tier 0 selection Home/NextMove already
  // use, scoped here to current-target-role gaps only (this function's own
  // filtering above), never recalculated or reinterpreted.
  const priorityGap = selectPriorityCapabilityGap(currentRoleGaps);

  // Both conditions are required, not redundant: a "developing" status can
  // be reached purely from self-reported (profile_snapshot) evidence with
  // zero mission_completion events (computeStatusFromProfileSnapshotEvidence),
  // so the evidence-count check excludes that case; and a capability whose
  // evidence was just recorded but whose status recalculation hasn't run
  // yet (a disclosed, self-healing possibility — see
  // capabilityStatusService/mission-complete.tsx) is honestly excluded by
  // the status check rather than mislabeled with a status the row doesn't
  // actually hold.
  const capabilitiesWithMissionEvidence: CareerStandingCapability[] =
    currentRoleGaps
      .filter(
        (gap) =>
          (missionEvidenceCountByGapId.get(gap.id) ?? 0) > 0 &&
          (gap.status === "developing" || gap.status === "strength"),
      )
      .map((gap) => ({
        capabilityName: gap.capability_name,
        status: gap.status as "developing" | "strength",
      }))
      .sort((a, b) => a.capabilityName.localeCompare(b.capabilityName));

  const latestMissionEvidenceDate = currentRoleMissionEvidence.reduce<
    string | null
  >(
    (latest, row) =>
      latest === null || row.created_at > latest ? row.created_at : latest,
    null,
  );

  return {
    targetRole: trimmedTargetRole,

    currentPriorityCapability: priorityGap
      ? {
          capabilityName: priorityGap.capability_name,
          priorityGapSince: priorityGap.created_at,
        }
      : null,

    capabilitiesWithMissionEvidence,

    latestMissionEvidenceDate,
  };
}

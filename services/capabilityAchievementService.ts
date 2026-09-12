import {
  computeStatusFromEvidence,
  computeStatusFromProfileSnapshotEvidence,
} from "./capabilityStatusService";
import { PHASE_10_2_ACTIVATION_CUTOFF } from "./capabilityEvidenceService";
import { CapabilityStatus } from "../types/capability";
import { CapabilityEvidenceTrailItem } from "../types/capabilityEvidenceTrail";

/**
 * Phase 13 — Career Achievement Record.
 *
 * Read-only, deterministic reconstruction of "when did this capability's
 * status actually change" and "what does its evidence amount to, in plain
 * English" — built entirely from a capability's own already-fetched
 * evidence trail (CapabilityEvidenceTrailItem[], oldest-first, exactly as
 * capabilityEvidenceTrailService already assembles it). No I/O, no AI call,
 * no new persisted entity, no second status system: this file imports and
 * replays computeStatusFromEvidence / computeStatusFromProfileSnapshotEvidence
 * from capabilityStatusService.ts UNMODIFIED — that remains the single
 * authority on what status a capability has. This file only asks, of
 * already-persisted evidence, "at which point in time did that authority's
 * own rule first produce each status" — a reconstructed fact, never stored,
 * always recomputed fresh from real evidence timestamps.
 */

/**
 * capability_evidence.provenance, as it already appears on a trail item.
 * mission_completion evidence -> "velyqo_verified"; profile_snapshot ->
 * "you_reported" (see capabilityEvidenceTrailService.provenanceFor). This
 * file only ever inspects that already-derived tag — never source_type
 * directly, so it stays in lockstep with whatever the trail already
 * decided, and never needs a second copy of that mapping.
 */
const MISSION_PROVENANCE = "velyqo_verified";

export interface CapabilityMilestones {
  /** STORED FACT — the earliest evidence event's own timestamp, verbatim.
   * Null only when there is no evidence at all. */
  firstEvidenceDate: string | null;

  /** RECONSTRUCTED FACT — the timestamp of the evidence event at which
   * replaying the existing status rule chronologically first yields
   * "developing" (or "strength", which always passes through this point
   * first under the mission path — see file header). Null when the replay
   * never reaches "developing" from this capability's own evidence. */
  developingAt: string | null;

  /** RECONSTRUCTED FACT — the timestamp of the evidence event at which the
   * replay first yields "strength". Only ever reachable via a SECOND
   * qualifying mission_completion event — profile_snapshot evidence can
   * never produce this, mirroring computeStatusFromProfileSnapshotEvidence's
   * own ceiling. Null when the replay never reaches "strength". */
  strengthAt: string | null;
}

/**
 * Replays the two existing, unmodified status-rule functions one evidence
 * event at a time, in chronological order, exactly mirroring the
 * composition recalculateCapabilityStatus already applies on every real
 * recalculation (mission-rule first, then profile-snapshot-rule, each fed
 * the running simulated status as its "current status" ceiling input).
 * Because both rules are monotonic and ratchet-only, this incremental
 * replay always agrees with a one-shot batch computation over the same
 * evidence — it is not a second interpretation of the rule, only the same
 * rule run forward in time instead of once at the end.
 *
 * `evidence` is assumed already oldest-first (the trail's own convention).
 * profile_snapshot items are only counted toward the "developing" replay
 * once their own date is at or after PHASE_10_2_ACTIVATION_CUTOFF — the
 * exact same cutoff getProfileSnapshotEvidence applies on the read side —
 * so a milestone can never be reconstructed as earlier than the real
 * status computation would have allowed.
 */
export function reconstructCapabilityMilestones(
  evidence: CapabilityEvidenceTrailItem[],
): CapabilityMilestones {
  if (evidence.length === 0) {
    return { firstEvidenceDate: null, developingAt: null, strengthAt: null };
  }

  const firstEvidenceDate = evidence[0].date;

  // Typed as the full CapabilityStatus union (not just the three states this
  // replay can actually reach) purely so it stays assignable from
  // computeStatusFromEvidence/computeStatusFromProfileSnapshotEvidence's own
  // return type without a cast — those functions remain the single
  // authority and are never reinterpreted here. Starting from "unknown"
  // rather than the capability's real initial status ("unknown" or
  // "priority_gap", decided elsewhere) is safe: both rules treat any
  // pre-"developing" status identically (see their own doc comments), so
  // the replay's floor state never affects which evidence event it
  // attributes each transition to.
  let simulatedStatus: CapabilityStatus = "unknown";
  let missionCount = 0;
  let qualifyingProfileSnapshotCount = 0;

  let developingAt: string | null = null;
  let strengthAt: string | null = null;

  for (const item of evidence) {
    if (item.provenance === MISSION_PROVENANCE) {
      missionCount += 1;
    } else if (item.date >= PHASE_10_2_ACTIVATION_CUTOFF) {
      qualifyingProfileSnapshotCount += 1;
    }

    const afterMission = computeStatusFromEvidence(
      simulatedStatus,
      missionCount,
    );

    const afterSnapshot = computeStatusFromProfileSnapshotEvidence(
      afterMission,
      qualifyingProfileSnapshotCount,
    );

    if (afterSnapshot !== simulatedStatus) {
      if (afterSnapshot === "developing" && developingAt === null) {
        developingAt = item.date;
      }

      if (afterSnapshot === "strength" && strengthAt === null) {
        strengthAt = item.date;
      }

      simulatedStatus = afterSnapshot;
    }
  }

  return { firstEvidenceDate, developingAt, strengthAt };
}

interface EvidenceCounts {
  missionCount: number;
  selfReportedCount: number;
}

/**
 * Counts evidence by provenance, straight off the same trail items the
 * screen already has — no new query. Self-reported counts here include
 * pre-cutoff profile_snapshot evidence (an honest historical fact, same as
 * the trail's own evidence list already shows), unlike the "developing"
 * replay above, which — matching computeStatusFromProfileSnapshotEvidence
 * exactly — only counts qualifying (post-cutoff) rows. This function is
 * describing what evidence EXISTS, not what counted toward status.
 */
export function countEvidenceByProvenance(
  evidence: CapabilityEvidenceTrailItem[],
): EvidenceCounts {
  let missionCount = 0;
  let selfReportedCount = 0;

  for (const item of evidence) {
    if (item.provenance === MISSION_PROVENANCE) {
      missionCount += 1;
    } else {
      selfReportedCount += 1;
    }
  }

  return { missionCount, selfReportedCount };
}

/**
 * A concise, deterministic, honest description of what evidence a
 * capability has — never a claim of real-world verification, never
 * "strength"/"developing" language of its own (the screen already shows
 * currentStatus alongside this), just a plain count of what happened.
 */
export function describeEvidenceSummary(counts: EvidenceCounts): string {
  const { missionCount, selfReportedCount } = counts;

  if (missionCount === 0 && selfReportedCount === 0) {
    return "No evidence yet.";
  }

  const missionPart =
    missionCount > 0
      ? `${missionCount} VELYQO mission${missionCount === 1 ? "" : "s"} completed`
      : null;

  const selfReportedPart =
    selfReportedCount > 0
      ? `${selfReportedCount} self-reported update${selfReportedCount === 1 ? "" : "s"}`
      : null;

  return `${[missionPart, selfReportedPart]
    .filter((part): part is string => part !== null)
    .join(", ")}.`;
}

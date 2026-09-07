import { CapabilityStatus } from "./capability";
import { JourneyEventProvenance } from "./careerJourney";

/**
 * Phase 11 Step 3 — Capability Evidence Trail contract.
 *
 * Answers "why does VELYQO currently assess this capability this way" —
 * grouped BY CAPABILITY, unlike careerJourneyService's CareerJourney,
 * which is grouped chronologically across everything. The two features
 * read overlapping tables (capability_evidence, capability_gaps) but
 * produce genuinely different shapes for genuinely different questions —
 * this is not duplication of Journey's timeline events (see
 * services/capabilityEvidenceTrailService.ts).
 *
 * `currentStatus` is always a direct, unmodified copy of
 * capability_gaps.status — this file computes nothing about status. No
 * score, no confidence, no readiness/alignment value appears anywhere
 * below.
 */

/**
 * One evidence event for one capability, oldest-first within its trail
 * (see services/capabilityEvidenceTrailService.ts for why evidence and
 * capability ordering deliberately go in opposite directions).
 */
export interface CapabilityEvidenceTrailItem {
  /** capability_evidence.id */
  id: string;

  /** capability_evidence.created_at */
  date: string;

  /** mission_completion -> "velyqo_verified"; profile_snapshot ->
   * "you_reported" — reuses JourneyEventProvenance verbatim rather than a
   * second provenance vocabulary. */
  provenance: JourneyEventProvenance;

  /** capability_evidence.note, verbatim — never invented, never blank
   * (every writer of this table always supplies one). */
  note: string;

  /**
   * A source-specific enrichment, when one exists and can be resolved:
   * for mission_completion evidence, the linked career_journal row's own
   * title (via the existing capability_evidence.journal_entry_id FK) —
   * real, persisted text, never generated. Null whenever that journal row
   * can't be resolved, and always null for profile_snapshot evidence
   * (which has no journal_entry_id and no other deterministic link back
   * to its originating check-in — never reconstructed by content/
   * timestamp matching).
   */
  sourceReference: string | null;
}

/**
 * One capability's full evidence trail. Included for EVERY capability_gaps
 * row the user has, across every target role they have ever had — never
 * restricted to the current target role (a capability from a past
 * destination remains valid historical evidence, per Phase 10.2/Phase 11's
 * established "capability_gaps rows are never deleted on a target-role
 * change" precedent).
 */
export interface CapabilityEvidenceTrail {
  capabilityGapId: string;

  capabilityName: string;

  /** capability_gaps.target_role, verbatim. */
  targetRole: string;

  /** True only when this row's target_role matches the user's CURRENT
   * profile.target_role (trimmed comparison). False — never true by
   * default — whenever that comparison can't honestly be made (profile
   * read failed); a historical capability must never be presented as
   * current just because the truth is unknown. */
  isCurrentTargetRole: boolean;

  /** Copied directly from capability_gaps.status — never recomputed,
   * never replayed from evidence, never inferred from this trail's own
   * evidence count. The single existing capability-status system remains
   * the only one. */
  currentStatus: CapabilityStatus;

  /** Oldest-first — see services/capabilityEvidenceTrailService.ts. */
  evidence: CapabilityEvidenceTrailItem[];
}

/**
 * Which of this service's four underlying reads failed.
 * "capability_gaps" is essential (its failure is fatal); the other three
 * are enrichment-only and degrade gracefully.
 */
export type CapabilityEvidenceTrailsSection =
  | "profile"
  | "capability_gaps"
  | "capability_evidence"
  | "journal";

/**
 * VELYQO's full per-capability evidence reconstruction for one user —
 * read-only, deterministic, no AI call, no write, no new persisted entity,
 * no second capability-status system.
 */
export interface CapabilityEvidenceTrails {
  /** Current-target-role capabilities first, then historical ones; within
   * each group, most-recent-activity first. See the service for the exact
   * tie-break rule. */
  trails: CapabilityEvidenceTrail[];

  /** True when one or more ENRICHMENT sections failed to read but the
   * overall assembly still succeeded — never true when capability_gaps
   * itself failed, since that is a fatal error instead. */
  partial: boolean;

  /** Which section(s) failed, when `partial` is true. Empty otherwise. */
  unavailableSections: CapabilityEvidenceTrailsSection[];
}

export type CapabilityEvidenceTrailsResult =
  | { data: CapabilityEvidenceTrails; error: null }
  | { data: null; error: string };

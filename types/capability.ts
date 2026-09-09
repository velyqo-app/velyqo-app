/**
 * How important a capability is for the user's target role.
 */
export type CapabilityImportance = "critical" | "important" | "helpful";

/**
 * A capability's current classification.
 *
 * `unknown` and `priority_gap` are deliberately distinct states: `unknown`
 * means there is simply no evidence yet either way, while `priority_gap`
 * means the capability matters enough for the target role to act on
 * despite that absence of evidence. Neither is a claim that the user
 * lacks the capability.
 */
export type CapabilityStatus =
  | "unknown"
  | "developing"
  | "strength"
  | "priority_gap";

/**
 * Shared display wording for CapabilityStatus — co-located with the type
 * itself, the same pattern types/careerContext.ts already establishes for
 * its own enums' _LABELS constants. Matches career-gaps.tsx's own existing
 * wording (the original source of these exact strings), so Journey Story
 * and Capability Evidence read as the same product instead of each keeping
 * an independent, driftable copy.
 */
export const CAPABILITY_STATUS_LABELS: Record<CapabilityStatus, string> = {
  priority_gap: "Priority Gaps",
  developing: "Developing",
  unknown: "Not Yet Assessed",
  strength: "Strengths",
};

/**
 * Where a piece of capability evidence came from. Deliberately limited to
 * data already in the app — no external sources (CV, LinkedIn, etc.).
 */
export type EvidenceSourceType = "profile_snapshot" | "mission_completion";

/**
 * How strongly a single evidence event supports a capability's status.
 */
export type EvidenceStrength = "supports_developing" | "supports_strength";

/**
 * A row from the `capability_gaps` table.
 */
export interface CapabilityGap {
  id: string;

  user_id: string;

  /**
   * Free-text snapshot of the target role at generation time, not an
   * occupation_id — the occupations catalogue is too sparse to key this
   * model off.
   */
  target_role: string;

  capability_name: string;

  capability_description: string | null;

  importance: CapabilityImportance;

  status: CapabilityStatus;

  /**
   * Deterministic sort position among this user's priority_gap rows. Null
   * until priority logic (a later step) assigns it.
   */
  priority_rank: number | null;

  evidence_summary: string | null;

  created_at: string;

  updated_at: string;
}

/**
 * A row from the `capability_evidence` table.
 */
export interface CapabilityEvidence {
  id: string;

  user_id: string;

  capability_gap_id: string;

  source_type: EvidenceSourceType;

  /**
   * Links mission-derived evidence back to the journal entry created on
   * completion. Null for profile_snapshot evidence.
   */
  journal_entry_id: string | null;

  strength: EvidenceStrength;

  note: string | null;

  created_at: string;
}

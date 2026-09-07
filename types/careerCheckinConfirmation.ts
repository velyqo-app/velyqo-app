/**
 * Phase 10.1 Step 7 — Career Check-in Confirmation contract.
 *
 * A CareerCheckinConfirmation is the user's AUTHORITATIVE record of which
 * of a Career Check-in's proposals (types/careerCheckinInterpretation.ts)
 * they confirmed, edited, or declined — and the orchestrator's own
 * resumability bookkeeping for applying those decisions to
 * profiles/capability_evidence/career_journal.
 *
 * Critical distinction, carried through every field below: the USER's
 * decision (`decision`, `appliedValue`, `capabilityGapId`) is authoritative
 * — it is what VELYQO is allowed to apply, and nothing more. The
 * ORCHESTRATOR's bookkeeping (`applyStatus`, `status`, `journal_entry_id`,
 * `completed_at`) is NEVER treated as authoritative career truth by the
 * orchestrator itself — see services/careerCheckinConfirmationService.ts
 * for exactly how and why (Step 7 design report §2). The real sources of
 * truth remain profiles, capability_evidence, and career_journal; this
 * table never becomes a second copy of any of them.
 */

/**
 * Step 8 prerequisite (added to the Step 7/7.1 contract): "declined" and
 * "unresolved" are deliberately distinct, both semantically and in what
 * gets persisted — they must never collapse into one value, even though
 * they behave identically at apply time (see requiresNoApplication in
 * services/careerCheckinConfirmationService.ts).
 * - "declined": VELYQO produced a proposal (or the user filled in an
 *   otherwise-unresolved report themselves) and the user explicitly chose
 *   not to apply it.
 * - "unresolved": VELYQO had no deterministic proposal for this report,
 *   and the user explicitly chose to leave it that way rather than supply
 *   a value. Only ever a valid decision for a reportIndex that appeared
 *   in CareerCheckinInterpretation.unresolvedReportIndices — never for a
 *   report that already had a proposal.
 */
export type CareerCheckinDecisionType =
  | "confirmed"
  | "edited"
  | "declined"
  | "unresolved";

/** The orchestrator's own record of whether it has actually performed the
 * write a decision implies. Resumability bookkeeping, not proof — see the
 * file-level comment. */
export type ApplyStatus = "pending" | "applied" | "failed";

export type ConfirmationStatus = "pending" | "completed" | "failed";

/**
 * One decision about one report within a check-in.
 *
 * `reportIndex` links back to the immutable CareerCheckin.reports this
 * confirmation belongs to — never a copy of the report's content.
 *
 * `appliedValue` is the exact value to apply: the original proposal's
 * value for "confirmed", the user's replacement for "edited", always null
 * for "declined". The one exception is a "new_evidence" report, where
 * `appliedValue` may be null even when confirmed/edited — the orchestrator
 * defaults it to the report's own `description` at apply time (there is
 * nothing to "confirm a value" for beyond the description itself, unless
 * the user chooses to edit the wording).
 *
 * `capabilityGapId` is meaningful only when the underlying report's
 * category is "new_evidence" (must be null for every other kind — the
 * orchestrator's pre-insert validation rejects a payload that violates
 * this). It is resolved and validated ONCE, against the target-role
 * context that existed at the moment the confirmation was saved, and is
 * never remapped afterward — a `target_change` decision confirmed in the
 * SAME check-in never causes this to be re-resolved. Per Step 7 design
 * report §1, this is safe: capability_gaps rows are never deleted on a
 * target-role change, so the link remains a valid, permanent, historical
 * association even after it stops being the user's current target role.
 * Null means "confirmed, but not linked to any specific capability" — a
 * legitimate, honest outcome (the achievement is still journaled; no
 * capability_evidence row is created for it).
 */
export interface CareerCheckinDecision {
  reportIndex: number;
  decision: CareerCheckinDecisionType;
  appliedValue: string | null;
  capabilityGapId: string | null;
  applyStatus: ApplyStatus;
}

/**
 * What a confirmation submits, before persistence. `decisions` arrives as
 * UNTRUSTED client input — services/careerCheckinConfirmationService.ts
 * validates every entry against a freshly recomputed interpretation of the
 * checkin (types/careerCheckinInterpretation.ts) before ever persisting
 * it. `applyStatus` on each incoming decision is ignored and force-reset
 * to "pending" by the persistence function itself — it is never trusted
 * from the caller, matching the file-level comment's authoritative/
 * bookkeeping split.
 */
export interface CareerCheckinConfirmationInput {
  checkinId: string;
  decisions: CareerCheckinDecision[];
}

/**
 * A persisted career_checkin_confirmations row. Snake_case, mirroring
 * CareerCheckin's own row-interface convention (types/careerCheckin.ts).
 */
export interface CareerCheckinConfirmation {
  id: string;
  checkin_id: string;
  user_id: string;
  decisions: CareerCheckinDecision[];
  status: ConfirmationStatus;
  journal_entry_id: string | null;
  created_at: string;
  completed_at: string | null;
}

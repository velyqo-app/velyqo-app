/**
 * Phase 10.1 Step 6 — Career Check-in Interpretation contract.
 *
 * An interpretation is a DERIVED, read-only reshaping of an already-
 * persisted CareerCheckin — never itself persisted, never itself a write.
 * It answers "what, if anything, can we propose back to the user from what
 * they reported?" while leaving every actual decision (confirm/edit/
 * decline, and the resulting profile/evidence/journal writes) to a later
 * step. Nothing in this file calls Supabase, calls AI, or writes anything.
 *
 * Reuses CareerCheckinReport exactly as Step 2 defined it
 * (types/careerCheckin.ts) — this file adds no new report shape, only a
 * derived reading of the existing one.
 *
 * Design rules carried over from the approved Step 5 report:
 * - No score, percentage, or confidence number anywhere in this file.
 * - `source` on a proposal is a plain two-value provenance tag
 *   ("user_reported" vs "ai_suggested") — Step 6 only ever produces
 *   "user_reported" proposals; "ai_suggested" is reserved for a future,
 *   still-unbuilt AI-assist step (Step 5's Q1/Q8) and exists on this type
 *   now so that future step is additive, not a breaking type change.
 * - EVERY proposal requires explicit user confirmation before anything is
 *   written anywhere — there is no "can persist without confirmation"
 *   bucket in this design. The only things that persist without a fresh
 *   confirmation are the raw CareerCheckin itself (already true before
 *   this file exists) and, later, the honest journal entry recording that
 *   a check-in happened (Step 5 Q6) — neither is this file's concern.
 * - `new_evidence` reports never claim a capability link — nothing in
 *   CareerCheckinReport supplies one, so nothing here invents one. Per
 *   Step 5 Q5/Q13, choosing which capability (if any) a piece of evidence
 *   relates to is a confirmation-time UI decision, not something this
 *   interpretation layer decides.
 */

/**
 * Where a proposal's value came from. Never a confidence score — a plain
 * provenance tag so a future confirmation UI can always show its source
 * honestly ("from what you told us" vs "AI suggestion").
 */
export type ProposalSource = "user_reported" | "ai_suggested";

interface CareerCheckinProposalBase {
  /** Index into the originating CareerCheckin.reports array — the
   * back-reference a consumer uses to show the original reported text
   * alongside this proposal, rather than this type duplicating it. */
  reportIndex: number;

  source: ProposalSource;
}

/** A proposal to update profiles.current_role — a PROPOSAL only, exactly
 * like RoleChangeReport.proposedCurrentRole's own doc comment requires.
 * This type never writes it anywhere. */
export interface UpdateCurrentRoleProposal extends CareerCheckinProposalBase {
  kind: "update_current_role";
  proposedValue: string;
}

/** A proposal to update profiles.target_role. Applying it — and anything
 * that should follow from a genuine target change (Step 5 Q7) — is
 * explicitly a later step's concern, never implied by this proposal
 * existing. */
export interface UpdateTargetRoleProposal extends CareerCheckinProposalBase {
  kind: "update_target_role";
  proposedValue: string;
}

/** A proposal to add one entry to profiles.skills. Merge-only at
 * confirmation time (Step 5 Q4) — never a blind replace. */
export interface AddSkillProposal extends CareerCheckinProposalBase {
  kind: "add_skill";
  skillName: string;
}

/** A proposal that would eventually become one capability_evidence row
 * with source_type "profile_snapshot" (Step 5 Q5) — carries only the
 * reported description; no capability link, no strength, no status
 * implication. Always produced for a NewEvidenceReport — there is nothing
 * to resolve, the description itself is the entire content. */
export interface AddEvidenceProposal extends CareerCheckinProposalBase {
  kind: "add_evidence";
  description: string;
}

export type CareerCheckinProposal =
  | UpdateCurrentRoleProposal
  | UpdateTargetRoleProposal
  | AddSkillProposal
  | AddEvidenceProposal;

/**
 * The derived interpretation of one persisted CareerCheckin.
 *
 * `proposals` and `unresolvedReportIndices` partition exactly the reports
 * that are NOT "no_change": every role_change/new_skill/target_change
 * report lands in one or the other (never both), and every new_evidence
 * report always lands in `proposals` (see AddEvidenceProposal). A
 * `no_change` report appears in neither — there is nothing to propose and
 * nothing unresolved about an explicit "nothing changed." A consumer that
 * wants to render every report, including acknowledged no_change ones,
 * reads the original CareerCheckin.reports directly (found via
 * `checkinId`, the same object this interpretation was built from) — this
 * type does not duplicate that array.
 */
export interface CareerCheckinInterpretation {
  checkinId: string;

  proposals: CareerCheckinProposal[];

  /** Indices into the originating CareerCheckin.reports for role_change /
   * new_skill / target_change reports that had no structured value to
   * propose (and, in Step 6, no AI to fill it in) — never silently
   * dropped, always still shown as the user's original reported text. */
  unresolvedReportIndices: number[];
}

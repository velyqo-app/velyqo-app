/**
 * Phase 10.1 Step 2 — Career Check-in contract.
 *
 * A Career Check-in is a persistent record of one completed check-in and
 * which categories of career change the user reported at that moment —
 * "since your last check-in, what changed?" It is deliberately NOT any of
 * the following, each already owned elsewhere in the architecture:
 * - CareerState (types/careerState.ts) — that is VELYQO's own derived
 *   understanding, rebuilt from persisted data on every read. A check-in
 *   is one of the INPUTS that eventually feeds it, never itself derived.
 * - Capability status (types/capability.ts) — status is exclusively a
 *   function of accumulated capability_evidence rows (see
 *   capabilityStatusService.computeStatusFromEvidence). A check-in
 *   reporting new evidence is a proposal for a future evidence row, never
 *   a direct status write.
 * - A score, a mission, a roadmap, or an AI assessment — none of those
 *   concepts appear anywhere in this file.
 * - A replacement for the Career Journal — a completed check-in is
 *   expected to still produce its own career_journal entry (reusing the
 *   existing, already-generic entry_type string column), the same way a
 *   completed mission already produces both a capability_evidence row AND
 *   a journal row. This type models only the check-in's own structured
 *   record, not its journal trace.
 *
 * Everything below represents USER-REPORTED information only. Nothing
 * here is derived, scored, AI-generated, or an applied change — see each
 * field's own doc comment for exactly what "proposed" does and does not
 * mean.
 */

/**
 * Which kind of career change a single report describes. "no_change" sits
 * on equal footing with the other four, not as a special case layered on
 * top — a check-in where the user affirmatively says nothing changed
 * produces one CareerCheckinReport with this category, exactly like any
 * other category produces one report.
 */
export type CareerCheckinCategory =
  | "role_change"
  | "new_evidence"
  | "new_skill"
  | "target_change"
  | "no_change";

/**
 * The user reported a change to their current role or day-to-day
 * responsibilities. `proposedCurrentRole` is a PROPOSAL only — it must
 * never be written to profiles.current_role directly. A future service
 * must surface it for explicit user confirmation through the same
 * profileService.updateProfile path Profile's own edit flow already uses
 * — exactly like any other profile edit, never a side effect of the
 * check-in itself. Null when the user described a change in
 * responsibilities without offering a new role title.
 */
export interface RoleChangeReport {
  category: "role_change";
  description: string;
  proposedCurrentRole: string | null;
}

/**
 * The user reported something they achieved or demonstrated outside of a
 * VELYQO mission (e.g. at work). This is real information, but it is NOT
 * capability evidence yet, and reporting it must never itself upgrade a
 * capability's status. A future service is expected to turn this into a
 * capability_evidence row via the schema's existing, currently-unused
 * "profile_snapshot" source_type (deliberately weaker than
 * "mission_completion", per the existing evidence model), then let the
 * existing, unmodified status-recalculation logic decide what it means —
 * never a direct status write, and this type carries nothing (no
 * capability link, no strength) that would let it skip that path.
 */
export interface NewEvidenceReport {
  category: "new_evidence";
  description: string;
}

/**
 * The user reported a new skill or certification. `skillName` is a
 * PROPOSAL for profiles.skills, self-reported like every existing skill
 * already is — not verified, not evidence, and not applied automatically;
 * it requires the same explicit-edit confirmation as any other proposed
 * profile change.
 */
export interface NewSkillReport {
  category: "new_skill";
  description: string;
  skillName: string | null;
}

/**
 * The user reported that their target role changed. `proposedTargetRole`
 * is a PROPOSAL only — applying it to profiles.target_role, and anything
 * that should follow from a genuine target change (e.g. the existing,
 * still-unimplemented target-role invalidation question), is explicitly a
 * future service/UI decision, never implied by this type existing.
 */
export interface TargetChangeReport {
  category: "target_change";
  description: string;
  proposedTargetRole: string | null;
}

/**
 * The user affirmatively reported that nothing meaningful changed. No
 * fields beyond the category itself — there is nothing to describe.
 */
export interface NoChangeReport {
  category: "no_change";
}

/**
 * One reported category within a check-in. A discriminated union — not
 * one flat interface with several nullable fields — so each category only
 * carries the fields actually meaningful for it, and so a future service
 * can tell exactly which follow-up data was supplied purely from
 * `.category` (Step 2's requirement 9), the same reasoning
 * types/nextMove.ts already applied for the same kind of "several
 * meaningfully different variants" shape.
 */
export type CareerCheckinReport =
  | RoleChangeReport
  | NewEvidenceReport
  | NewSkillReport
  | TargetChangeReport
  | NoChangeReport;

/**
 * What a completed check-in submits, before persistence. No `id`, no
 * `user_id` — a future service derives that from the authenticated
 * session, matching every other write path in this app
 * (capabilityEvidenceService, journalService) — and no timestamp, which
 * would be assigned at insert time by a database column default, matching
 * every other timestamped table in this schema, never something
 * application code sets itself.
 *
 * `reports` is an array so one check-in can hold multiple categories at
 * once (requirement 7) — e.g. a role change AND a new skill reported in
 * the same check-in. A `no_change` report is expected to be the only
 * entry when present; mutual exclusivity with real change reports is a
 * future service's validation concern, not something this type enforces
 * mechanically — the same way, for example, CapabilityGap's own type does
 * not mechanically forbid a non-null priority_rank on a non-"priority_gap"
 * row; that invariant is owned by the code that constructs one, not the
 * type itself.
 */
export interface CareerCheckinInput {
  reports: CareerCheckinReport[];
}

/**
 * A persisted career_checkins row — the future table this type
 * anticipates but this step does not create (no migration, no service).
 * Adds exactly what persistence requires on top of CareerCheckinInput:
 * `id`, `user_id`, `created_at` — snake_case, mirroring CapabilityGap's /
 * CapabilityEvidence's / JournalEntry's own row-interface convention.
 * (This file models a genuine persisted record, not a derived application
 * object like CareerState/NextMove, which is why it follows the row
 * convention rather than theirs.) `reports` intentionally reuses the exact
 * same CareerCheckinReport[] shape as the input — it is not a SQL column
 * mirror in the way `id`/`user_id`/`created_at` are, so there is no
 * snake_case form of it to convert to; whether it ends up stored as one
 * JSONB column or a normalized child table is a future migration
 * decision this type deliberately stays agnostic to.
 */
export interface CareerCheckin {
  id: string;
  user_id: string;
  reports: CareerCheckinReport[];
  created_at: string;
}

import { CareerCheckinCategory } from "./careerCheckin";
import { CareerCheckinDecisionType } from "./careerCheckinConfirmation";

/**
 * Phase 11 Step 3 — Career Journey Intelligence assembly contract.
 *
 * A JourneyEvent answers "what happened, and when" — never "what should I
 * do next" (NextMove) and never "where do I stand right now" (CareerState).
 * Every field below is copied verbatim from an already-persisted row
 * (career_journal / career_checkins / career_checkin_confirmations /
 * capability_evidence / capability_gaps) or is a direct, deterministic
 * cross-reference between those rows via an existing foreign key — nothing
 * here is AI-generated, scored, or inferred. See
 * services/careerJourneyService.ts for exactly how each variant is built.
 *
 * This is NOT a second CareerState and NOT a second capability-status
 * system: a capability's CURRENT status is never represented here — only
 * `capabilityGapId`/`capabilityName` (a name lookup, nothing else) ever
 * appear on an event, and even that is optional, degrading to null rather
 * than failing when it cannot be resolved.
 */

/**
 * Who supplied an event's content:
 * - "you_reported": the user's own words (a check-in report, a direct
 *   Profile edit) — self-reported, exactly like existing "profile_snapshot"
 *   evidence and existing Career Check-in categories already are.
 * - "velyqo_verified": VELYQO's own record of a completed mission —
 *   exactly like existing "mission_completion" evidence already is.
 *
 * Deliberately just these two — matches the exact two-value distinction
 * Phase 10.2's capability_evidence.source_type already draws, rather than
 * inventing a third, broader vocabulary for Journey events specifically.
 */
export type JourneyEventProvenance = "you_reported" | "velyqo_verified";

interface JourneyEventBase {
  /** Stable identity for list rendering — always the id of the single
   * persisted row this event is anchored to (a career_journal.id or a
   * career_checkins.id), never a synthetic composite key. */
  id: string;

  /** ISO timestamp this event is ordered by — always a real `created_at`
   * column value, never computed or defaulted. */
  date: string;
}

/**
 * A completed VELYQO mission. Anchored to its career_journal row
 * (entry_type "mission", created by mission-complete.tsx unchanged).
 * capabilityName is resolved via capability_evidence.journal_entry_id —
 * present only when that mission was for a Tier 0 capability mission and
 * the linked evidence/capability could both be found; null is an honest,
 * expected outcome (a Tier 1/2 mission has no capability link at all), not
 * a failure.
 */
export interface MissionCompletedEvent extends JourneyEventBase {
  type: "mission_completed";

  title: string;
  description: string | null;

  capabilityGapId: string | null;
  capabilityName: string | null;

  provenance: "velyqo_verified";
}

/**
 * One report within a check-in, in the check-in's own original order.
 * `decision`/`appliedValue`/`capabilityGapId` come from that check-in's
 * confirmation (if one exists) — reusing CareerCheckinDecisionType exactly
 * rather than collapsing confirmed/edited/declined/unresolved into a
 * boolean. `decision` is null when no confirmation decision exists for
 * this report at all — the honest, expected state for a `no_change`
 * report (nothing to decide) and equally honest for an actionable report
 * that was never reviewed (a confirmation was never saved, or never
 * applied) — this type does not and cannot distinguish those two null
 * cases from the report alone; a future UI that needs to is expected to
 * read the report's own `category` alongside `decision === null`, not
 * something this contract encodes separately.
 */
export interface CheckinItem {
  category: CareerCheckinCategory;

  /** The user's own reported text. Absent (empty string) only for
   * "no_change", which carries no description in the source contract. */
  description: string;

  decision: CareerCheckinDecisionType | null;

  appliedValue: string | null;

  capabilityGapId: string | null;
  capabilityName: string | null;
}

/**
 * One submitted Career Check-in. Anchored to its career_checkins row —
 * NEVER to the confirmation's own journal_entry_id row, which is absorbed
 * into this event rather than rendered separately (see
 * careerJourneyService's dedup pass).
 */
export interface CheckinSubmittedEvent extends JourneyEventBase {
  type: "checkin_submitted";

  items: CheckinItem[];

  provenance: "you_reported";
}

/**
 * A direct Profile edit (Current Role / Target Role / a newly added
 * Skill) — Phase 11 Step 1's entry_type "profile_edit" journal rows,
 * verbatim. Never created by a check-in (check-in-driven role/target/skill
 * changes appear inside that check-in's own CheckinSubmittedEvent
 * instead).
 */
export interface ProfileEditedEvent extends JourneyEventBase {
  type: "profile_edited";

  title: string;
  description: string;

  provenance: "you_reported";
}

/**
 * The safety net (Phase 11 Step 2 discovery §4, case 4): any career_journal
 * row that entry_type classification and check-in-absorption both fail to
 * claim. Expected to be rare-to-never against current data — every row
 * this codebase writes today is entry_type "mission", "checkin" (always
 * claimed via an existing confirmation link once one has been genuinely
 * applied), or "profile_edit" — but never silently dropped if one turns up
 * (an orphaned "checkin" row with no matching confirmation, or a genuinely
 * unrecognized entry_type).
 */
export interface GenericJournalEvent extends JourneyEventBase {
  type: "generic_journal_entry";

  title: string;
  description: string | null;

  provenance: "you_reported";
}

/**
 * A discriminated union, not one flat interface with several nullable
 * fields — matches types/nextMove.ts's own established reasoning for the
 * same shape of problem: each variant only carries the fields that are
 * ever meaningful for it.
 */
export type JourneyEvent =
  | MissionCompletedEvent
  | CheckinSubmittedEvent
  | ProfileEditedEvent
  | GenericJournalEvent;

/**
 * Which of Journey Assembly's five underlying reads failed. "journal" and
 * "checkins" are essential — their failure is a fatal CareerJourneyResult
 * error (see below); the other three are enrichment-only and degrade
 * gracefully (see services/careerJourneyService.ts §8).
 */
export type JourneySection =
  | "journal"
  | "checkins"
  | "confirmations"
  | "capability_evidence"
  | "capability_gaps";

/**
 * VELYQO's full "how did I get here" reconstruction for one user —
 * read-only, deterministic, no AI call, no write, no new persisted entity.
 * Mirrors CareerState's own file-level framing (types/careerState.ts): a
 * DERIVED application object, never itself a source of truth. `events` is
 * always newest-first (Phase 11 Step 2 discovery §7) — "This week / This
 * month / Earlier" grouping is deliberately left to the UI layer, not
 * represented here.
 */
export interface CareerJourney {
  events: JourneyEvent[];

  /** True when one or more ENRICHMENT sections failed to read but the
   * overall assembly still succeeded — never true when journal or
   * checkins themselves failed, since that is a fatal error instead. */
  partial: boolean;

  /** Which section(s) failed, when `partial` is true. Empty otherwise. */
  unavailableSections: JourneySection[];
}

export type CareerJourneyResult =
  | { data: CareerJourney; error: null }
  | { data: null; error: string };

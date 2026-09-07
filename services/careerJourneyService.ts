import { getCareerCheckinConfirmations } from "./careerCheckinConfirmationService";
import { getCareerCheckins } from "./careerCheckinService";
import { getAllCapabilityEvidenceForUser } from "./capabilityEvidenceService";
import { getAllCapabilityGapsForUser } from "./capabilityGapService";
import { getJournal } from "./journalService";
import { CareerCheckin, CareerCheckinReport } from "../types/careerCheckin";
import { CareerCheckinConfirmation } from "../types/careerCheckinConfirmation";
import { CapabilityEvidence, CapabilityGap } from "../types/capability";
import {
  CareerJourneyResult,
  CheckinItem,
  CheckinSubmittedEvent,
  GenericJournalEvent,
  JourneyEvent,
  JourneySection,
  MissionCompletedEvent,
  ProfileEditedEvent,
} from "../types/careerJourney";
import { JournalEntry } from "../types/journal";

/**
 * Phase 11 Step 3 — Career Journey Assembly.
 *
 * Read-only, deterministic reconstruction of "how did I get here" from
 * data that already exists — career_journal, career_checkins,
 * career_checkin_confirmations, capability_evidence, capability_gaps. No
 * write, no AI call, no new persisted entity, no second capability-status
 * system (a capability's current status is never represented here — only
 * its name, resolved for display), and no influence on CareerState or
 * NextMove, both of which remain entirely untouched and unaware this file
 * exists. See the Phase 11 Step 2 discovery report for the full
 * architecture rationale.
 */

const MISSION_ENTRY_TYPE = "mission";
const CHECKIN_ENTRY_TYPE = "checkin";
const PROFILE_EDIT_ENTRY_TYPE = "profile_edit";

function capabilityNameFor(
  capabilityGapId: string | null,
  capabilityGapsById: Map<string, CapabilityGap>,
): string | null {
  if (!capabilityGapId) {
    return null;
  }

  return capabilityGapsById.get(capabilityGapId)?.capability_name ?? null;
}

/** NoChangeReport carries no `description` field at all — the honest
 * representation is an empty string, never an invented placeholder. */
function reportDescription(report: CareerCheckinReport): string {
  return report.category === "no_change" ? "" : report.description;
}

function buildMissionEvent(
  journal: JournalEntry,
  evidenceByJournalEntryId: Map<string, CapabilityEvidence>,
  capabilityGapsById: Map<string, CapabilityGap>,
): MissionCompletedEvent {
  const evidence = evidenceByJournalEntryId.get(journal.id) ?? null;
  const capabilityGapId = evidence?.capability_gap_id ?? null;

  return {
    type: "mission_completed",
    id: journal.id,
    date: journal.created_at,
    title: journal.title,
    description: journal.description,
    capabilityGapId,
    capabilityName: capabilityNameFor(capabilityGapId, capabilityGapsById),
    provenance: "velyqo_verified",
  };
}

function buildProfileEditedEvent(journal: JournalEntry): ProfileEditedEvent {
  return {
    type: "profile_edited",
    id: journal.id,
    date: journal.created_at,
    title: journal.title,
    description: journal.description ?? "",
    provenance: "you_reported",
  };
}

function buildGenericEvent(journal: JournalEntry): GenericJournalEvent {
  return {
    type: "generic_journal_entry",
    id: journal.id,
    date: journal.created_at,
    title: journal.title,
    description: journal.description,
    provenance: "you_reported",
  };
}

function buildCheckinEvent(
  checkin: CareerCheckin,
  confirmation: CareerCheckinConfirmation | null,
  capabilityGapsById: Map<string, CapabilityGap>,
): CheckinSubmittedEvent {
  const decisionByReportIndex = new Map(
    (confirmation?.decisions ?? []).map((decision) => [
      decision.reportIndex,
      decision,
    ]),
  );

  const items: CheckinItem[] = checkin.reports.map((report, index) => {
    const decision = decisionByReportIndex.get(index) ?? null;
    const capabilityGapId = decision?.capabilityGapId ?? null;

    return {
      category: report.category,
      description: reportDescription(report),
      decision: decision?.decision ?? null,
      appliedValue: decision?.appliedValue ?? null,
      capabilityGapId,
      capabilityName: capabilityNameFor(capabilityGapId, capabilityGapsById),
    };
  });

  return {
    type: "checkin_submitted",
    id: checkin.id,
    date: checkin.created_at,
    items,
    provenance: "you_reported",
  };
}

/**
 * Pure classification/linking/dedup/ordering — given the five sources
 * already fetched, returns the fully merged, newest-first JourneyEvent
 * list. No I/O, no Date.now(), deterministic: the same five arrays always
 * produce the same output. Exported (rather than kept private inside
 * getCareerJourney) specifically so this — the actual interesting logic —
 * is directly, cheaply unit-testable without a network call, matching this
 * codebase's established pattern for pure/impure separation (e.g.
 * capabilityStatusService.computeStatusFromEvidence,
 * careerCheckinConfirmationService's own internal helpers).
 */
export function assembleJourneyEvents(
  journal: JournalEntry[],
  checkins: CareerCheckin[],
  confirmations: CareerCheckinConfirmation[],
  evidence: CapabilityEvidence[],
  capabilityGaps: CapabilityGap[],
): JourneyEvent[] {
  const capabilityGapsById = new Map(
    capabilityGaps.map((gap) => [gap.id, gap]),
  );

  const evidenceByJournalEntryId = new Map<string, CapabilityEvidence>();

  for (const row of evidence) {
    if (row.journal_entry_id) {
      evidenceByJournalEntryId.set(row.journal_entry_id, row);
    }
  }

  const confirmationByCheckinId = new Map(
    confirmations.map((confirmation) => [confirmation.checkin_id, confirmation]),
  );

  // Every journal_entry_id a confirmation has already claimed for its own
  // checkin_submitted event — that journal row must never also be rendered
  // as a separate, duplicate event.
  const claimedJournalEntryIds = new Set<string>();

  for (const confirmation of confirmations) {
    if (confirmation.journal_entry_id) {
      claimedJournalEntryIds.add(confirmation.journal_entry_id);
    }
  }

  const events: JourneyEvent[] = [];

  for (const row of journal) {
    if (row.entry_type === MISSION_ENTRY_TYPE) {
      events.push(
        buildMissionEvent(row, evidenceByJournalEntryId, capabilityGapsById),
      );
      continue;
    }

    if (row.entry_type === PROFILE_EDIT_ENTRY_TYPE) {
      events.push(buildProfileEditedEvent(row));
      continue;
    }

    if (row.entry_type === CHECKIN_ENTRY_TYPE && claimedJournalEntryIds.has(row.id)) {
      // Absorbed into its owning checkin_submitted event below — never a
      // separate event, never silently discarded either (the check-in
      // itself still produces one, just from career_checkins directly).
      continue;
    }

    // Safety net — an unrecognized entry_type, or a "checkin" row no
    // confirmation ever claimed. Never dropped.
    events.push(buildGenericEvent(row));
  }

  for (const checkin of checkins) {
    const confirmation = confirmationByCheckinId.get(checkin.id) ?? null;

    events.push(buildCheckinEvent(checkin, confirmation, capabilityGapsById));
  }

  // Newest first — matches getJournal's own existing convention. Ties
  // (same timestamp) keep their relative build order, which is harmless
  // and never relied upon for correctness.
  events.sort((a, b) => b.date.localeCompare(a.date));

  return events;
}

/**
 * Assembles VELYQO's full "how did I get here" reconstruction for one
 * user.
 *
 * `journal` and `checkins` are essential — a genuine read failure on
 * either fails the whole call, since there is nothing honest to assemble
 * without them (never silently substituted with an empty feed, which would
 * misrepresent "we don't know" as "nothing happened"). `confirmations`,
 * `capability_evidence`, and `capability_gaps` are enrichment-only: a
 * failure on any of them degrades that specific enrichment to null/empty
 * (a check-in's items simply carry no decision, a mission's capability
 * name simply resolves to null) rather than failing the whole assembly —
 * `partial`/`unavailableSections` report exactly which section(s) were
 * unavailable, so a future UI can show one honest, unobtrusive note
 * instead of either hiding the gap or blocking the whole screen.
 *
 * Fetches all five sources in parallel via the existing, unmodified
 * service layer (getJournal, getCareerCheckins,
 * getCareerCheckinConfirmations, getAllCapabilityEvidenceForUser,
 * getAllCapabilityGapsForUser) — no direct Supabase query lives in this
 * file — then delegates all classification/linking/ordering to the pure
 * assembleJourneyEvents above.
 */
export async function getCareerJourney(
  userId: string,
): Promise<CareerJourneyResult> {
  const [journalResult, checkinsResult, confirmationsResult, evidenceResult, gapsResult] =
    await Promise.all([
      getJournal(userId),
      getCareerCheckins(userId),
      getCareerCheckinConfirmations(userId),
      getAllCapabilityEvidenceForUser(userId),
      getAllCapabilityGapsForUser(userId),
    ]);

  if (journalResult.error || !journalResult.data) {
    console.warn(
      "CareerJourney: journal read failed:",
      journalResult.error?.message,
    );

    return {
      data: null,
      error: "We couldn't load your career journey. Please try again.",
    };
  }

  if (checkinsResult.error || !checkinsResult.data) {
    console.warn(
      "CareerJourney: check-ins read failed:",
      checkinsResult.error?.message,
    );

    return {
      data: null,
      error: "We couldn't load your career journey. Please try again.",
    };
  }

  const unavailableSections: JourneySection[] = [];

  if (confirmationsResult.error || !confirmationsResult.data) {
    console.warn(
      "CareerJourney: confirmations read failed:",
      confirmationsResult.error,
    );
    unavailableSections.push("confirmations");
  }

  if (evidenceResult.error || !evidenceResult.data) {
    console.warn(
      "CareerJourney: capability evidence read failed:",
      evidenceResult.error,
    );
    unavailableSections.push("capability_evidence");
  }

  if (gapsResult.error || !gapsResult.data) {
    console.warn(
      "CareerJourney: capability gaps read failed:",
      gapsResult.error,
    );
    unavailableSections.push("capability_gaps");
  }

  // getJournal does not apply .returns<JournalEntry[]>() itself (unmodified
  // this step) — annotated explicitly here rather than widening this
  // file's own typing to `any`.
  const journal = journalResult.data as JournalEntry[];
  const checkins = checkinsResult.data;
  const confirmations = confirmationsResult.data ?? [];
  const evidence = evidenceResult.data ?? [];
  const capabilityGaps = gapsResult.data ?? [];

  const events = assembleJourneyEvents(
    journal,
    checkins,
    confirmations,
    evidence,
    capabilityGaps,
  );

  return {
    data: {
      events,
      partial: unavailableSections.length > 0,
      unavailableSections,
    },
    error: null,
  };
}

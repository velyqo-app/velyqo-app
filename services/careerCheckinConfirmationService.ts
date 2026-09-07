import { UserData } from "../context/UserContext";
import { invalidateCachedRoadmap } from "../hooks/useRoadmap";
import { getCareerCheckinById } from "./careerCheckinService";
import { interpretCareerCheckin } from "./careerCheckinInterpretationService";
import { getCapabilityGapById } from "./capabilityGapService";
import { recordProfileSnapshotEvidence } from "./capabilityEvidenceService";
import { recalculateCapabilityStatus } from "./capabilityStatusService";
import { createJournalEntry } from "./journalService";
import { getProfile, updateProfile } from "./profileService";
import { supabase } from "../lib/supabase";
import { CareerCheckin, CareerCheckinReport } from "../types/careerCheckin";
import {
  ApplyStatus,
  CareerCheckinConfirmation,
  CareerCheckinConfirmationInput,
  CareerCheckinDecision,
  CareerCheckinDecisionType,
  ConfirmationStatus,
} from "../types/careerCheckinConfirmation";
import { Profile } from "../types/profile";

/**
 * Phase 10.1 Step 7 / 7.1 — Career Check-in confirmation persistence +
 * downstream application orchestration.
 *
 * Step 7.1 correction (see the Step 7.1 design report for the full
 * analysis): there is no service-role/Edge Function writer in this app, so
 * the orchestrator and a hand-crafted client request are indistinguishable
 * at the RLS layer — no grant can make "the orchestrator wrote this" mean
 * something different from "the client wrote this". The trust boundary is
 * therefore enforced two ways instead:
 *
 * 1. `career_checkin_confirmations.decisions` (the validated proposal
 *    content: reportIndex/decision/appliedValue/capabilityGapId) is
 *    write-once — insertable, never updatable, at the column-grant level.
 *    A client cannot repoint a capabilityGapId after the row exists,
 *    full stop, regardless of what it's granted to update elsewhere.
 * 2. `status`, `apply_progress`, and `journal_entry_id` remain
 *    client-writable (unavoidable without new infrastructure) but are
 *    NEVER read by this file as proof that a write happened. Every call
 *    to applyCareerCheckinConfirmation re-derives true completion from
 *    live reads of profiles/capability_evidence/career_journal. A
 *    tampered value in any of these three columns is silently corrected
 *    on the very next genuine apply call — it has no lasting effect.
 *
 * Owns exactly what the Step 7/7.1 design assigns to it:
 * - Validating an untrusted CareerCheckinConfirmationInput against a
 *   freshly recomputed interpretation of the immutable career_checkins row
 *   it claims to belong to, before ever persisting anything.
 * - Persisting the user's decisions as the authoritative, immutable record
 *   of what VELYQO is allowed to apply.
 * - Applying only confirmed/edited decisions through the EXISTING,
 *   unmodified source-of-truth services (profileService,
 *   capabilityEvidenceService, journalService) — never a second write
 *   path to profiles/capability_evidence/career_journal.
 *
 * Never touches Career State or the Next Move Engine — both remain
 * entirely derived and see every change here for free, on their next
 * natural read of profiles/capability_gaps/career_journal.
 */

// ---------------------------------------------------------------------
// Internal persistence shapes — distinct from the public
// CareerCheckinConfirmation/CareerCheckinDecision contract (which keeps
// carrying applyStatus per decision, unchanged). Nothing outside this
// file needs to know decisions/apply_progress are two separate columns.
// ---------------------------------------------------------------------

interface PersistedDecision {
  reportIndex: number;
  decision: CareerCheckinDecisionType;
  appliedValue: string | null;
  capabilityGapId: string | null;
}

interface ApplyProgressEntry {
  reportIndex: number;
  applyStatus: ApplyStatus;
}

interface ConfirmationRow {
  id: string;
  checkin_id: string;
  user_id: string;
  decisions: PersistedDecision[];
  apply_progress: ApplyProgressEntry[];
  status: ConfirmationStatus;
  journal_entry_id: string | null;
  created_at: string;
  completed_at: string | null;
}

/** Explicit whitelist reconstruction — only these four validated fields
 * are ever persisted. Deliberately not a `{ ...decision }` spread: an
 * unknown client-supplied property must never ride along into storage
 * (Step 7 review finding I1). */
function toPersistedDecision(decision: CareerCheckinDecision): PersistedDecision {
  return {
    reportIndex: decision.reportIndex,
    decision: decision.decision,
    appliedValue: decision.appliedValue,
    capabilityGapId: decision.capabilityGapId,
  };
}

/** Merges the immutable, validated `decisions` with the orchestrator's own
 * `apply_progress` bookkeeping into the public CareerCheckinConfirmation
 * shape every exported function returns — preserves the existing public
 * contract even though the two pieces are now stored separately. A
 * decision with no matching apply_progress entry (declined/unresolved
 * decisions are never given one) reads as "pending", matching the
 * original convention. */
function toPublicConfirmation(row: ConfirmationRow): CareerCheckinConfirmation {
  const progressByIndex = new Map(
    row.apply_progress.map((entry) => [entry.reportIndex, entry.applyStatus]),
  );

  return {
    id: row.id,
    checkin_id: row.checkin_id,
    user_id: row.user_id,
    status: row.status,
    journal_entry_id: row.journal_entry_id,
    created_at: row.created_at,
    completed_at: row.completed_at,
    decisions: row.decisions.map((decision) => ({
      ...decision,
      applyStatus: progressByIndex.get(decision.reportIndex) ?? "pending",
    })),
  };
}

// ---------------------------------------------------------------------
// Pre-insert validation (§3, unchanged from Step 7) — pure, no I/O beyond
// the capability ownership check, which is intentionally kept separate.
// ---------------------------------------------------------------------

function isPlainString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Validates a CareerCheckinConfirmationInput's decisions against the
 * immutable checkin they claim to belong to. Returns a user-facing error
 * string on the first violation found, or null if every decision is
 * genuinely well-formed. This is the mechanism that makes "the client
 * must not be able to manufacture a proposal VELYQO never produced" true:
 * every decision is checked against interpretCareerCheckin's OWN output
 * (Step 6, unmodified, re-run here), which is entirely determined by data
 * the client cannot alter (the immutable career_checkins row), never
 * against anything the client itself asserts.
 */
function validateDecisions(
  checkin: CareerCheckin,
  decisions: unknown,
): string | null {
  if (!Array.isArray(decisions)) {
    return "Your check-in decisions couldn't be read. Please try again.";
  }

  const interpretation = interpretCareerCheckin(checkin);

  const actionableIndices = new Set<number>([
    ...interpretation.proposals.map((proposal) => proposal.reportIndex),
    ...interpretation.unresolvedReportIndices,
  ]);

  const seenIndices = new Set<number>();

  for (const decision of decisions as unknown[]) {
    if (
      !decision ||
      typeof decision !== "object" ||
      !("reportIndex" in decision) ||
      !("decision" in decision) ||
      !("appliedValue" in decision) ||
      !("capabilityGapId" in decision)
    ) {
      return "One of your check-in decisions is malformed.";
    }

    const candidate = decision as Record<string, unknown>;

    // Rule: runtime shape — this arrives as network JSON, not something
    // the TypeScript signature can enforce at the boundary.
    if (
      typeof candidate.reportIndex !== "number" ||
      !Number.isInteger(candidate.reportIndex) ||
      !isPlainString(candidate.decision) ||
      !["confirmed", "edited", "declined", "unresolved"].includes(candidate.decision) ||
      (candidate.appliedValue !== null && !isPlainString(candidate.appliedValue)) ||
      (candidate.capabilityGapId !== null && !isPlainString(candidate.capabilityGapId))
    ) {
      return "One of your check-in decisions is malformed.";
    }

    const reportIndex = candidate.reportIndex;
    const decisionType = candidate.decision as CareerCheckinDecision["decision"];
    const appliedValue = candidate.appliedValue as string | null;
    const capabilityGapId = candidate.capabilityGapId as string | null;

    // Rule 2: range.
    if (reportIndex < 0 || reportIndex >= checkin.reports.length) {
      return "One of your check-in decisions refers to a change we don't recognize.";
    }

    // Rule 3: the report must actually be actionable per the deterministic
    // interpretation of the raw check-in — never trust the client's own
    // claim that a proposal exists.
    if (!actionableIndices.has(reportIndex)) {
      return "One of your check-in decisions doesn't match anything you reported.";
    }

    // Rule 7: no duplicate reportIndex entries.
    if (seenIndices.has(reportIndex)) {
      return "Your check-in has more than one decision for the same reported change.";
    }
    seenIndices.add(reportIndex);

    const report = checkin.reports[reportIndex];

    // Rule 6: capabilityGapId is only meaningful for new_evidence reports.
    if (capabilityGapId !== null && report.category !== "new_evidence") {
      return "A capability link was supplied for something that isn't a reported achievement.";
    }

    if (decisionType === "declined" || decisionType === "unresolved") {
      // Neither has anything to apply — carrying a value or a capability
      // link is an inconsistent, rejected payload for either. "declined"
      // and "unresolved" are validated identically here; only their
      // persisted meaning differs (see the type's own doc comment).
      if (appliedValue !== null || capabilityGapId !== null) {
        return decisionType === "declined"
          ? "A declined change must not carry an applied value or capability link."
          : "A change left unresolved must not carry an applied value or capability link.";
      }
      continue;
    }

    // Rule 4: appliedValue must be a real, non-empty value for anything
    // that isn't declined/unresolved — except new_evidence, where null is
    // allowed (the orchestrator defaults it to the report's own
    // description at apply time; there is no equivalent safe default for
    // a role/target role/skill, since an unresolved report's own
    // structured field may itself be null).
    if (appliedValue !== null && appliedValue.trim().length === 0) {
      return "One of your confirmed changes has an empty value.";
    }

    if (appliedValue === null && report.category !== "new_evidence") {
      return "One of your confirmed changes is missing a value to apply.";
    }
  }

  // Rule 8: completeness — every actionable report must have exactly one
  // decision. A client that silently omits one is rejected, rather than
  // leaving it permanently undecided.
  for (const index of actionableIndices) {
    if (!seenIndices.has(index)) {
      return "Please confirm, edit, or decline every reported change before saving.";
    }
  }

  return null;
}

/**
 * Rule 5: capabilityGapId ownership — the one validation rule that needs a
 * real read. Every capabilityGapId referenced must belong to the
 * authenticated user; it does NOT need to match the user's CURRENT
 * target_role — capability_gaps rows are never deleted on a target-role
 * change, so a link to an "inactive" (prior target role) capability is a
 * legitimate, permanently valid historical association, not something
 * this check rejects.
 */
async function validateCapabilityGapOwnership(
  userId: string,
  decisions: CareerCheckinDecision[],
): Promise<string | null> {
  const capabilityGapIds = Array.from(
    new Set(
      decisions
        .map((decision) => decision.capabilityGapId)
        .filter((id): id is string => id !== null),
    ),
  );

  if (capabilityGapIds.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("capability_gaps")
    .select("id")
    .eq("user_id", userId)
    .in("id", capabilityGapIds);

  if (error) {
    return "We couldn't verify one of the capabilities you linked. Please try again.";
  }

  const ownedIds = new Set((data ?? []).map((row) => row.id as string));
  const hasUnowned = capabilityGapIds.some((id) => !ownedIds.has(id));

  if (hasUnowned) {
    return "One of the capabilities you linked doesn't belong to your account.";
  }

  return null;
}

// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

async function getRawConfirmation(userId: string, checkinId: string) {
  return await supabase
    .from("career_checkin_confirmations")
    .select("*")
    .eq("user_id", userId)
    .eq("checkin_id", checkinId)
    .returns<ConfirmationRow[]>()
    .maybeSingle();
}

/** A single career_checkin_confirmations row for one check-in, scoped to
 * the given user, in the public CareerCheckinConfirmation shape (decisions
 * merged with apply_progress). Raw supabase-shape {data, error} result,
 * matching getProfile/getCapabilityGapById's own read-function
 * convention. */
export async function getCareerCheckinConfirmation(
  userId: string,
  checkinId: string,
) {
  const { data, error } = await getRawConfirmation(userId, checkinId);

  if (error || !data) {
    return { data: null, error };
  }

  return { data: toPublicConfirmation(data), error: null };
}

// ---------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------

export type SaveCareerCheckinConfirmationResult =
  | { data: CareerCheckinConfirmation; error: null }
  | { data: null; error: string };

/**
 * Validates and persists a completed confirmation for one check-in.
 * Performs NO downstream application (profile/evidence/journal writes) —
 * that is applyCareerCheckinConfirmation's job, called separately.
 *
 * Persists ONLY the four validated decision fields (Step 7.1 point 12) —
 * `apply_progress` starts empty; `decisions` is never given an applyStatus
 * to begin with, and — per the Step 7.1 migration — has no UPDATE grant
 * at all once inserted, making it genuinely write-once rather than merely
 * intended to be.
 *
 * Protected by career_checkin_confirmations' own `unique (checkin_id)`
 * constraint: a retried Save after an uncertain network result either
 * succeeds once, or hits the unique violation and this function fetches
 * and returns the row that already exists rather than treating that as a
 * failure.
 */
export async function saveCareerCheckinConfirmation(
  userId: string,
  input: CareerCheckinConfirmationInput,
): Promise<SaveCareerCheckinConfirmationResult> {
  const { data: checkin, error: checkinError } = await getCareerCheckinById(
    userId,
    input.checkinId,
  );

  if (checkinError || !checkin) {
    return { data: null, error: "We couldn't find that check-in." };
  }

  const semanticError = validateDecisions(checkin, input.decisions);

  if (semanticError) {
    return { data: null, error: semanticError };
  }

  const decisions = input.decisions as CareerCheckinDecision[];

  const ownershipError = await validateCapabilityGapOwnership(userId, decisions);

  if (ownershipError) {
    return { data: null, error: ownershipError };
  }

  const persistedDecisions: PersistedDecision[] = decisions.map(toPersistedDecision);

  const { data, error } = await supabase
    .from("career_checkin_confirmations")
    .insert({
      checkin_id: input.checkinId,
      user_id: userId,
      decisions: persistedDecisions,
      apply_progress: [],
      status: "pending",
    })
    .select()
    .returns<ConfirmationRow[]>()
    .single();

  if (error) {
    // Postgres unique_violation — a confirmation for this check-in already
    // exists (a retried Save after an uncertain network result).
    if (error.code === "23505") {
      const existing = await getCareerCheckinConfirmation(userId, input.checkinId);

      if (existing.data) {
        return { data: existing.data, error: null };
      }
    }

    console.warn("CareerCheckinConfirmation: insert failed:", error.message);

    return {
      data: null,
      error: "We couldn't save your confirmation. Please try again.",
    };
  }

  return { data: toPublicConfirmation(data), error: null };
}

// ---------------------------------------------------------------------
// Apply / retry — Step 7.1: no trust of stored status/apply_progress/
// journal_entry_id anywhere below. Every call re-derives true completion
// from live reads.
// ---------------------------------------------------------------------

/** Local, private mapping from a Profile row to the UserData shape
 * invalidateCachedRoadmap needs — mirrors careerStateService.ts's own
 * private toRoadmapLookupInput exactly (small, mechanical, not worth
 * exporting/importing across services for; careerStateService.ts itself
 * is not imported here, per the Step 7 constraint not to touch it). */
function toUserDataSnapshot(profile: Profile, userId: string): UserData {
  return {
    userId,

    userType: profile.user_type || "",
    name: profile.full_name || "",
    goal: profile.goal || "",
    country: profile.country || "",

    currentRole: profile.current_role || "",
    currentOccupationId: profile.current_occupation_id || null,
    currentSalary: profile.current_salary ? profile.current_salary.toString() : "",

    targetRole: profile.target_role || "",
    targetOccupationId: profile.target_occupation_id || null,
    targetSalary: profile.target_salary ? profile.target_salary.toString() : "",

    startingSituation: (profile.starting_situation ||
      "") as UserData["startingSituation"],
    experienceLevel: (profile.experience_level ||
      "") as UserData["experienceLevel"],
    educationLevel: (profile.education_level || "") as UserData["educationLevel"],
    skills: profile.skills || [],
    targetTimeframe: (profile.target_timeframe ||
      "") as UserData["targetTimeframe"],

    profileLoaded: true,
  };
}

/**
 * True for decisions that require no application at all — either the user
 * explicitly declined a proposal VELYQO understood, or explicitly chose to
 * leave an unresolved report unresolved (Step 8 prerequisite). Both are
 * treated identically here (nothing to write, never blocks completion);
 * only their persisted `decision` value differs, which is what preserves
 * the honest distinction between the two for good.
 */
function requiresNoApplication(decision: {
  decision: CareerCheckinDecisionType;
}): boolean {
  return decision.decision === "declined" || decision.decision === "unresolved";
}

type ProfileAffectingCategory = "role_change" | "target_change" | "new_skill";

function isProfileAffectingCategory(
  category: CareerCheckinReport["category"],
): category is ProfileAffectingCategory {
  return (
    category === "role_change" ||
    category === "target_change" ||
    category === "new_skill"
  );
}

/**
 * Verifies (and, where needed, performs) every profile-affecting decision
 * (role_change/target_change/new_skill) as ONE combined profiles write.
 * Never reads any stored applyStatus to decide what to (re-)attempt —
 * instead compares each decision's appliedValue against a FRESH profiles
 * read to decide whether a write is still needed, then re-verifies against
 * the post-write (or, if nothing needed writing, the same fresh) state to
 * produce the returned per-decision status. This is what makes the
 * eventual "completed" verdict trustworthy regardless of what a client
 * wrote into status/apply_progress directly.
 *
 * Disclosed limitation (unchanged in spirit from Step 7, now reachable on
 * any call rather than only an explicit retry, since the terminal
 * short-circuit was removed): if the user edits current_role/target_role/
 * skills again through Profile, independently, between one apply call and
 * a later one, this live comparison will no longer match this check-in's
 * confirmed value and will report that decision as "failed" again — it
 * does NOT re-assert the check-in's value over a later, legitimate,
 * unrelated edit. Accepted as correct, conservative behavior: silently
 * overwriting a user's later edit to force an old check-in's value back
 * would be worse.
 */
async function verifyAndApplyProfileDecisions(
  userId: string,
  checkin: CareerCheckin,
  decisions: PersistedDecision[],
): Promise<Map<number, ApplyStatus>> {
  const result = new Map<number, ApplyStatus>();

  const categoryByIndex = new Map<number, ProfileAffectingCategory>();

  for (const decision of decisions) {
    if (requiresNoApplication(decision)) {
      continue;
    }

    const report = checkin.reports[decision.reportIndex];

    if (report && isProfileAffectingCategory(report.category)) {
      categoryByIndex.set(decision.reportIndex, report.category);
    }
  }

  if (categoryByIndex.size === 0) {
    return result;
  }

  const { data: profile, error: profileError } = await getProfile(userId);

  if (profileError || !profile) {
    for (const reportIndex of categoryByIndex.keys()) {
      result.set(reportIndex, "failed");
    }
    return result;
  }

  const decisionByIndex = new Map(decisions.map((d) => [d.reportIndex, d]));

  const matchesLive = (
    reportIndex: number,
    category: ProfileAffectingCategory,
    liveProfile: Profile,
  ): boolean => {
    const expected = decisionByIndex.get(reportIndex)!.appliedValue as string;

    if (category === "role_change") {
      return liveProfile.current_role === expected;
    }

    if (category === "target_change") {
      return liveProfile.target_role === expected;
    }

    return (liveProfile.skills ?? []).some(
      (skill) => skill.trim().toLowerCase() === expected.trim().toLowerCase(),
    );
  };

  const needsWrite = Array.from(categoryByIndex.entries()).filter(
    ([reportIndex, category]) => !matchesLive(reportIndex, category, profile),
  );

  const updates: Record<string, unknown> = {};
  let mergedSkills: string[] | null = null;

  for (const [reportIndex, category] of needsWrite) {
    const value = decisionByIndex.get(reportIndex)!.appliedValue as string;

    if (category === "role_change") {
      updates.current_role = value;
    } else if (category === "target_change") {
      updates.target_role = value;
    } else if (category === "new_skill") {
      if (mergedSkills === null) {
        mergedSkills = [...(profile.skills ?? [])];
      }

      const alreadyPresent = mergedSkills.some(
        (skill) => skill.trim().toLowerCase() === value.trim().toLowerCase(),
      );

      if (!alreadyPresent) {
        mergedSkills.push(value);
      }
    }
  }

  if (mergedSkills !== null) {
    updates.skills = mergedSkills;
  }

  let writeSucceeded = true;

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await updateProfile(userId, updates);

    writeSucceeded = !updateError;

    if (!updateError && ("current_role" in updates || "target_role" in updates)) {
      // Reuses the exact pattern app/(app)/profile.tsx already uses on a
      // role/target-role edit — never a new invalidation mechanism.
      await invalidateCachedRoadmap(toUserDataSnapshot(profile, userId), {
        alsoDecision: "target_role" in updates,
      });
    }

    if (updateError) {
      console.warn(
        "CareerCheckinConfirmation: profile update failed:",
        updateError.message,
      );
    }
  }

  const effectiveProfile: Profile = writeSucceeded
    ? { ...profile, ...updates }
    : profile;

  for (const [reportIndex, category] of categoryByIndex.entries()) {
    result.set(
      reportIndex,
      matchesLive(reportIndex, category, effectiveProfile) ? "applied" : "failed",
    );
  }

  return result;
}

/**
 * Phase 10.2 — recalculates ONE capability's status after a Career Check-in
 * evidence decision has been successfully resolved this call (see the two
 * call sites in verifyAndApplyEvidenceDecisions below). Deliberately called
 * for BOTH outcomes of that resolution — a fresh insert and a decision whose
 * evidence row already existed — not only a fresh insert: recalculation
 * reads a live, current evidence count and is itself idempotent (a no-op
 * write when nothing changed), so re-running it on an already-existing row
 * is safe and correct, not merely convenient (Phase 10.2 Step 1 §G/§H).
 *
 * Mirrors mission-complete.tsx's recordCapabilityEvidence: a failure here —
 * whether the gap lookup or the recalculation itself — is logged and never
 * propagated. The evidence write this follows has already genuinely
 * succeeded (or was already applied) by the time this runs; nothing here
 * may turn that into a "failed" decision. An unresolved status here simply
 * self-heals on the capability's next successful recalculation.
 */
async function recalculateCapabilityStatusForEvidence(
  userId: string,
  capabilityGapId: string,
): Promise<void> {
  const { data: gap, error: gapError } = await getCapabilityGapById(
    userId,
    capabilityGapId,
  );

  if (gapError || !gap) {
    console.warn(
      "CareerCheckinConfirmation: capability status recalculation skipped — gap not found or not owned by user:",
      gapError?.message,
    );
    return;
  }

  const statusResult = await recalculateCapabilityStatus(userId, gap);

  if (statusResult.error !== null) {
    console.warn(
      "CareerCheckinConfirmation: capability status recalculation failed (evidence is preserved, will be picked up by a later recalculation):",
      statusResult.error,
    );
  }
}

/**
 * Verifies (and, where needed, performs) every new_evidence decision as an
 * independent capability_evidence insert. Idempotency is content-based,
 * not bookkeeping-based: before inserting, checks whether a row already
 * exists for (user_id, capability_gap_id, note) — both of which are drawn
 * from immutable inputs (capabilityGapId/appliedValue live in the
 * write-once `decisions` column; report.description comes from the
 * immutable career_checkins row), so this existence check is a genuine
 * proof of prior application, never a trust of apply_progress.
 *
 * A confirmed evidence decision with no capabilityGapId is "applied"
 * immediately — nothing to write, a legitimate, honest "journaled only"
 * outcome, never an error.
 *
 * Phase 10.2: every decision that resolves to "applied" against a real
 * capabilityGapId (whether newly written or already existing) triggers a
 * capability status recalculation for that one capability — see
 * recalculateCapabilityStatusForEvidence above. A decision that resolves to
 * "failed" (the existence check itself failing, or the insert failing)
 * never triggers one — a failed evidence write must never cause a status
 * update, by construction of this control flow.
 */
async function verifyAndApplyEvidenceDecisions(
  userId: string,
  checkin: CareerCheckin,
  decisions: PersistedDecision[],
): Promise<Map<number, ApplyStatus>> {
  const result = new Map<number, ApplyStatus>();

  for (const decision of decisions) {
    if (requiresNoApplication(decision)) {
      continue;
    }

    const report = checkin.reports[decision.reportIndex];

    if (!report || report.category !== "new_evidence") {
      continue;
    }

    if (decision.capabilityGapId === null) {
      result.set(decision.reportIndex, "applied");
      continue;
    }

    const note = decision.appliedValue ?? report.description;

    const { data: existing, error: existingError } = await supabase
      .from("capability_evidence")
      .select("id")
      .eq("user_id", userId)
      .eq("capability_gap_id", decision.capabilityGapId)
      .eq("note", note)
      .limit(1);

    if (existingError) {
      console.warn(
        "CareerCheckinConfirmation: evidence existence check failed:",
        existingError.message,
      );
      result.set(decision.reportIndex, "failed");
      continue;
    }

    if (existing && existing.length > 0) {
      result.set(decision.reportIndex, "applied");
      await recalculateCapabilityStatusForEvidence(userId, decision.capabilityGapId);
      continue;
    }

    const evidenceResult = await recordProfileSnapshotEvidence(
      userId,
      decision.capabilityGapId,
      note,
    );

    if (evidenceResult.error) {
      console.warn(
        "CareerCheckinConfirmation: evidence write failed:",
        evidenceResult.error,
      );
      result.set(decision.reportIndex, "failed");
      continue;
    }

    result.set(decision.reportIndex, "applied");
    await recalculateCapabilityStatusForEvidence(userId, decision.capabilityGapId);
  }

  return result;
}

const MAX_JOURNAL_DESCRIPTION = 200;

function truncate(text: string, max: number): string {
  const trimmed = text.trim();

  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Reports the user's own words honestly — never AI interpretation, never
 * an "applied" value presented as settled fact. `no_change` contributes
 * nothing to describe. */
function reportSummary(report: CareerCheckinReport): string | null {
  switch (report.category) {
    case "role_change":
      return `Role: ${report.description}`;
    case "new_evidence":
      return `Achievement: ${report.description}`;
    case "new_skill":
      return `New skill: ${report.description}`;
    case "target_change":
      return `Target change: ${report.description}`;
    case "no_change":
      return null;
  }
}

function buildJournalDescription(reports: CareerCheckinReport[]): string {
  const summaries = reports
    .map(reportSummary)
    .filter((summary): summary is string => summary !== null);

  if (summaries.length === 0) {
    return "Checked in: no changes to report.";
  }

  return truncate(summaries.join(" · "), MAX_JOURNAL_DESCRIPTION);
}

/**
 * Verifies (and, where needed, creates) the check-in's journal entry.
 *
 * Step 7.1 note: the design report's own proposal — checking for an
 * existing row purely by content (user_id + entry_type + description) —
 * turned out to be an implementation blocker, not just a tampering
 * concern: two genuinely different check-ins can legitimately produce the
 * IDENTICAL description (most obviously, any two standalone `no_change`
 * check-ins both produce exactly "Checked in: no changes to report."), so
 * a pure content match would silently skip journaling the second one —
 * a real correctness bug in ordinary, non-adversarial use, not merely a
 * tampering edge case. `career_journal` was deliberately kept schema-
 * unchanged (no checkin_id column), so there is no fully collision-proof
 * content key available without touching that table.
 *
 * Resolution: `journal_entry_id` IS still used as the correlation pointer
 * (it has to be — content alone is ambiguous), but it is no longer
 * TRUSTED blindly — it is verified (exists, belongs to this user, is a
 * "checkin"-type entry) before being relied on. This closes the original
 * concern (a tampered id pointing at an unrelated or foreign row can no
 * longer suppress journal creation) without reintroducing the content-
 * collision bug. The residual risk — a client repoints journal_entry_id
 * at one of their OWN other genuine checkin journal entries — is
 * self-contained and cosmetic (a missing/duplicate journal entry in their
 * own timeline), the same class of accepted, disclosed, bounded-harm
 * limitation as the concurrent-evidence-insert race below.
 */
async function verifyOrCreateJournalEntry(
  userId: string,
  checkin: CareerCheckin,
  storedJournalEntryId: string | null,
): Promise<string | null> {
  if (storedJournalEntryId !== null) {
    const { data: existingById, error: existingByIdError } = await supabase
      .from("career_journal")
      .select("id")
      .eq("id", storedJournalEntryId)
      .eq("user_id", userId)
      .eq("entry_type", "checkin")
      .maybeSingle();

    if (!existingByIdError && existingById) {
      return existingById.id;
    }
  }

  const { data, error } = await createJournalEntry({
    userId,
    title: "Career check-in",
    description: buildJournalDescription(checkin.reports),
    entryType: "checkin",
  });

  if (error || !data) {
    console.warn(
      "CareerCheckinConfirmation: journal entry failed:",
      error?.message,
    );

    return null;
  }

  return data.id;
}

export type ApplyCareerCheckinConfirmationResult =
  | { data: CareerCheckinConfirmation; error: null }
  | { data: null; error: string };

/**
 * Applies a saved confirmation's decisions to profiles/capability_evidence/
 * career_journal, and marks it completed only once every applicable
 * (confirmed/edited) decision is verifiably applied AND the journal entry
 * exists — declined and unresolved decisions require nothing and never
 * block completion (see requiresNoApplication). Also serves
 * as the retry entry point — every call performs the same full
 * re-verification, so calling it again after a crash, a failure, or a
 * tampering attempt converges on the same correct end state.
 *
 * Step 7.1: deliberately has NO short-circuit on a stored "completed"
 * status (or on any stored bookkeeping) — status/apply_progress/
 * journal_entry_id are never read as proof, only ever written as the
 * output of this function's own live verification. See the file-level
 * comment for why this is required given the RLS/grant model.
 *
 * Never modifies Career State or the Next Move Engine directly — both
 * remain entirely derived and pick up every change here on their next
 * natural read.
 */
export async function applyCareerCheckinConfirmation(
  userId: string,
  checkinId: string,
): Promise<ApplyCareerCheckinConfirmationResult> {
  const { data: row, error: rowError } = await getRawConfirmation(userId, checkinId);

  if (rowError || !row) {
    return { data: null, error: "We couldn't find that check-in confirmation." };
  }

  const { data: checkin, error: checkinError } = await getCareerCheckinById(
    userId,
    checkinId,
  );

  if (checkinError || !checkin) {
    return { data: null, error: "We couldn't find the original check-in." };
  }

  const profileStatuses = await verifyAndApplyProfileDecisions(
    userId,
    checkin,
    row.decisions,
  );

  const evidenceStatuses = await verifyAndApplyEvidenceDecisions(
    userId,
    checkin,
    row.decisions,
  );

  const journalEntryId = await verifyOrCreateJournalEntry(
    userId,
    checkin,
    row.journal_entry_id,
  );

  const applyProgress: ApplyProgressEntry[] = [];
  let allApplied = true;

  for (const decision of row.decisions) {
    if (requiresNoApplication(decision)) {
      continue;
    }

    // Every applicable, validated decision (confirmed/edited) maps to
    // exactly one of the two verifiers above (profile-affecting or
    // new_evidence) — the "failed" fallback is defensive and unreachable
    // given save-time validation; it is never treated as a silent success.
    const status: ApplyStatus =
      profileStatuses.get(decision.reportIndex) ??
      evidenceStatuses.get(decision.reportIndex) ??
      "failed";

    applyProgress.push({ reportIndex: decision.reportIndex, applyStatus: status });

    if (status !== "applied") {
      allApplied = false;
    }
  }

  const finalStatus: ConfirmationStatus =
    allApplied && journalEntryId !== null ? "completed" : "failed";

  const { data: updatedRow, error: updateError } = await supabase
    .from("career_checkin_confirmations")
    .update({
      apply_progress: applyProgress,
      status: finalStatus,
      journal_entry_id: journalEntryId,
      completed_at: finalStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", row.id)
    .eq("user_id", userId)
    .select()
    .returns<ConfirmationRow[]>()
    .single();

  if (updateError || !updatedRow) {
    console.warn(
      "CareerCheckinConfirmation: status update failed:",
      updateError?.message,
    );

    return {
      data: null,
      error:
        "We saved your changes but couldn't finish updating your check-in. Please try again.",
    };
  }

  return { data: toPublicConfirmation(updatedRow), error: null };
}

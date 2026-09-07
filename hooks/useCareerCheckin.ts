import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";

import { useProfile } from "./useProfile";
import { getCurrentUser } from "../services/authService";
import { getCapabilityGaps } from "../services/capabilityGapService";
import { createCareerCheckin } from "../services/careerCheckinService";
import {
  applyCareerCheckinConfirmation,
  saveCareerCheckinConfirmation,
} from "../services/careerCheckinConfirmationService";
import { interpretCareerCheckin } from "../services/careerCheckinInterpretationService";
import { CapabilityGap } from "../types/capability";
import {
  CareerCheckin,
  CareerCheckinCategory,
  CareerCheckinReport,
} from "../types/careerCheckin";
import {
  CareerCheckinConfirmation,
  CareerCheckinDecision,
  CareerCheckinDecisionType,
} from "../types/careerCheckinConfirmation";
import { CareerCheckinProposal } from "../types/careerCheckinInterpretation";

/**
 * Phase 10.1 Step 8 — Career Check-in flow orchestration.
 *
 * Owns everything the check-in screen needs: step state, category/detail
 * drafts, the review decisions the user builds up, and the calls into the
 * existing Step 6/7/7.1 services in exactly the sequence approved —
 * createCareerCheckin -> interpretCareerCheckin (local, pure) ->
 * saveCareerCheckinConfirmation -> applyCareerCheckinConfirmation. No new
 * backend surface, no parallel persistence, no AsyncStorage draft, no
 * global state — everything here is local to one mounted instance of this
 * hook, exactly as approved.
 */

export type CheckinStep =
  | "entry"
  | "categories"
  | "details"
  | "creating"
  | "review"
  | "saving"
  | "summary"
  | "applying"
  | "complete";

/** Fixed, stable order reports are built in regardless of selection order
 * — keeps reportIndex predictable and simple to reason about. */
const SELECTABLE_CATEGORIES: Exclude<CareerCheckinCategory, "no_change">[] = [
  "role_change",
  "new_evidence",
  "new_skill",
  "target_change",
];

const CATEGORY_LABELS: Record<CareerCheckinCategory, string> = {
  role_change: "My role or responsibilities changed",
  new_evidence: "I achieved something new",
  new_skill: "I learned a new skill or qualification",
  target_change: "My target changed",
  no_change: "Nothing meaningful has changed",
};

export { CATEGORY_LABELS, SELECTABLE_CATEGORIES };

interface DetailDraft {
  description: string;
  structuredValue: string;
}

const EMPTY_DRAFT: DetailDraft = { description: "", structuredValue: "" };

/**
 * Pure: true only when `no_change` is the sole selected category —
 * toggleCategory already guarantees it can never coexist with another
 * category, but this is evaluated independently of that guarantee so the
 * decision itself (BLOCKER-1: route straight through submitNoChange
 * rather than ever reaching an empty Details screen) is unit-testable on
 * its own.
 */
export function isNoChangeOnlySelection(
  selectedCategories: Set<CareerCheckinCategory>,
): boolean {
  return selectedCategories.size === 1 && selectedCategories.has("no_change");
}

/**
 * Pure: selected categories + their detail drafts -> one CareerCheckinInput
 * report per category, in SELECTABLE_CATEGORIES' fixed order (exactly one
 * report per category, per the approved MVP scope). An empty/whitespace-
 * only structured field becomes null, not an empty string — matching
 * interpretCareerCheckin's own "null means unresolved" convention, never a
 * blank proposal.
 */
export function buildReportsFromDrafts(
  selectedCategories: Set<CareerCheckinCategory>,
  details: Partial<Record<CareerCheckinCategory, DetailDraft>>,
): CareerCheckinReport[] {
  return SELECTABLE_CATEGORIES.filter((category) =>
    selectedCategories.has(category),
  ).map((category) => {
    const draft = details[category] ?? EMPTY_DRAFT;
    const description = draft.description.trim();
    const structured = draft.structuredValue.trim() || null;

    if (category === "role_change") {
      return {
        category: "role_change" as const,
        description,
        proposedCurrentRole: structured,
      };
    }

    if (category === "target_change") {
      return {
        category: "target_change" as const,
        description,
        proposedTargetRole: structured,
      };
    }

    if (category === "new_skill") {
      return {
        category: "new_skill" as const,
        description,
        skillName: structured,
      };
    }

    return { category: "new_evidence" as const, description };
  });
}

/**
 * Pure: one confirmed ReviewRow -> the CareerCheckinDecision it submits.
 * `decision` must already be non-null (canProceedFromReview's own gate
 * guarantees this before this is ever called) — the cast documents that
 * precondition rather than silently tolerating a null.
 */
export function buildDecisionFromReviewRow(row: ReviewRow): CareerCheckinDecision {
  const decision = row.decision as CareerCheckinDecisionType;

  if (decision === "declined" || decision === "unresolved") {
    return {
      reportIndex: row.reportIndex,
      decision,
      appliedValue: null,
      capabilityGapId: null,
      applyStatus: "pending",
    };
  }

  const appliedValue =
    decision === "edited" ? row.editedValue.trim() : row.proposedDisplayValue;

  return {
    reportIndex: row.reportIndex,
    decision,
    appliedValue,
    capabilityGapId: row.category === "new_evidence" ? row.capabilityGapId : null,
    applyStatus: "pending",
  };
}

/** One row the Review step renders — either a deterministic proposal or an
 * unresolved report, normalized into one shape so CheckinReviewCard never
 * needs to branch on which. `decision` starts null (undecided) for both:
 * an unresolved report is never defaulted to declined, per the approved
 * Step 8 requirement. */
export interface ReviewRow {
  reportIndex: number;
  category: CareerCheckinCategory;
  originalDescription: string;
  isUnresolved: boolean;
  proposalKind: CareerCheckinProposal["kind"] | null;
  source: CareerCheckinProposal["source"] | null;
  /** The human-readable value VELYQO proposes (role title / skill name /
   * achievement text) — null for an unresolved row, which has none. */
  proposedDisplayValue: string | null;
  decision: CareerCheckinDecisionType | null;
  editedValue: string;
  /** Only meaningful for a new_evidence row. Null = "not linked to a
   * specific capability" — the honest, always-valid default. */
  capabilityGapId: string | null;
}

export function proposalDisplayValue(proposal: CareerCheckinProposal): string {
  switch (proposal.kind) {
    case "update_current_role":
    case "update_target_role":
      return proposal.proposedValue;
    case "add_skill":
      return proposal.skillName;
    case "add_evidence":
      return proposal.description;
  }
}

export interface SummaryProfileChange {
  label: string;
  value: string;
}

export interface SummaryEvidenceItem {
  description: string;
  capabilityName: string | null;
}

export interface CheckinSummary {
  profileChanges: SummaryProfileChange[];
  evidence: SummaryEvidenceItem[];
  declinedCount: number;
  unresolvedCount: number;
}

export function buildSummary(
  rows: ReviewRow[],
  capabilityOptions: CapabilityGap[],
): CheckinSummary {
  const profileChanges: SummaryProfileChange[] = [];
  const evidence: SummaryEvidenceItem[] = [];
  let declinedCount = 0;
  let unresolvedCount = 0;

  for (const row of rows) {
    if (row.decision === "declined") {
      declinedCount += 1;
      continue;
    }

    if (row.decision === "unresolved") {
      unresolvedCount += 1;
      continue;
    }

    if (row.decision !== "confirmed" && row.decision !== "edited") {
      continue;
    }

    const value =
      row.decision === "edited" ? row.editedValue.trim() : row.proposedDisplayValue ?? "";

    if (row.category === "role_change") {
      profileChanges.push({ label: "Current role", value });
    } else if (row.category === "target_change") {
      profileChanges.push({ label: "Target role", value });
    } else if (row.category === "new_skill") {
      profileChanges.push({ label: "New skill", value });
    } else if (row.category === "new_evidence") {
      const capability = capabilityOptions.find((c) => c.id === row.capabilityGapId);
      evidence.push({
        description: value,
        capabilityName: capability ? capability.capability_name : null,
      });
    }
  }

  return { profileChanges, evidence, declinedCount, unresolvedCount };
}

export function useCareerCheckin() {
  const { userData, reloadProfile } = useProfile();

  const [step, setStep] = useState<CheckinStep>("entry");
  const [error, setError] = useState<string | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<
    Set<CareerCheckinCategory>
  >(new Set());
  const [details, setDetails] = useState<
    Partial<Record<CareerCheckinCategory, DetailDraft>>
  >({});

  const [checkin, setCheckin] = useState<CareerCheckin | null>(null);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [capabilityOptions, setCapabilityOptions] = useState<CapabilityGap[]>([]);
  const [confirmation, setConfirmation] = useState<CareerCheckinConfirmation | null>(
    null,
  );

  // True only while an applyCareerCheckinConfirmation call is genuinely in
  // flight — distinct from step === "applying", which also covers the
  // resolved-but-failed results/retry view CheckinApplyStep renders once
  // the call returns.
  const [applyInFlight, setApplyInFlight] = useState(false);

  // True only while a createCareerCheckin (Details -> Review) or
  // saveCareerCheckinConfirmation (Review -> Summary) call is genuinely in
  // flight — lets CheckinDetailsStep/the Review step's own Continue button
  // visibly reflect real in-flight work, in addition to (never instead of)
  // submittingRef's own synchronous guard below.
  const [savingInFlight, setSavingInFlight] = useState(false);

  // Guards every network-triggering action against a double-tap firing a
  // second concurrent call — the same shape DestinationDecision.tsx's own
  // `submitting`/ref guard already uses, not the heavier route-key pattern
  // (this flow never re-navigates to itself on retry).
  const submittingRef = useRef(false);

  const toggleCategory = useCallback((category: CareerCheckinCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);

      if (category === "no_change") {
        return next.has("no_change") ? new Set() : new Set(["no_change"]);
      }

      if (next.has("no_change")) {
        next.delete("no_change");
      }

      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }

      return next;
    });
  }, []);

  const setDetailField = useCallback(
    (
      category: CareerCheckinCategory,
      field: "description" | "structuredValue",
      value: string,
    ) => {
      setDetails((prev) => ({
        ...prev,
        [category]: { ...(prev[category] ?? EMPTY_DRAFT), [field]: value },
      }));
    },
    [],
  );

  const canProceedFromCategories = selectedCategories.size > 0;

  const canProceedFromDetails = useMemo(() => {
    for (const category of selectedCategories) {
      if (category === "no_change") {
        continue;
      }

      const draft = details[category] ?? EMPTY_DRAFT;

      if (draft.description.trim().length === 0) {
        return false;
      }
    }

    return true;
  }, [selectedCategories, details]);

  const resolveUserId = useCallback(async (): Promise<string | null> => {
    const {
      data: { user },
    } = await getCurrentUser();

    return user ? user.id : null;
  }, []);

  /** Builds ReviewRow[] from a freshly created checkin's interpretation,
   * and — only if a new_evidence proposal exists — loads the user's
   * current-target-role capability list for the picker. Historical-link
   * correctness (Step 7 design report §1) falls out naturally here: this
   * read happens before anything is applied, so it reflects exactly the
   * target-role context "at the moment the confirmation was made." */
  const buildReviewState = useCallback(
    async (newCheckin: CareerCheckin) => {
      const interpretation = interpretCareerCheckin(newCheckin);

      const rows: ReviewRow[] = [];

      for (const proposal of interpretation.proposals) {
        const report = newCheckin.reports[proposal.reportIndex];

        rows.push({
          reportIndex: proposal.reportIndex,
          category: report.category,
          originalDescription: report.category === "no_change" ? "" : report.description,
          isUnresolved: false,
          proposalKind: proposal.kind,
          source: proposal.source,
          proposedDisplayValue: proposalDisplayValue(proposal),
          decision: null,
          editedValue: "",
          capabilityGapId: null,
        });
      }

      for (const reportIndex of interpretation.unresolvedReportIndices) {
        const report = newCheckin.reports[reportIndex];

        rows.push({
          reportIndex,
          category: report.category,
          originalDescription: report.category === "no_change" ? "" : report.description,
          isUnresolved: true,
          proposalKind: null,
          source: null,
          proposedDisplayValue: null,
          decision: null,
          editedValue: "",
          capabilityGapId: null,
        });
      }

      rows.sort((a, b) => a.reportIndex - b.reportIndex);

      setReviewRows(rows);

      const needsCapabilityOptions = rows.some(
        (row) => row.proposalKind === "add_evidence",
      );

      if (needsCapabilityOptions && userData.userId && userData.targetRole.trim()) {
        const { data } = await getCapabilityGaps(
          userData.userId,
          userData.targetRole.trim(),
        );

        setCapabilityOptions(data ?? []);
      } else {
        setCapabilityOptions([]);
      }
    },
    [userData.userId, userData.targetRole],
  );

  const goToCategories = useCallback(() => {
    setError(null);
    setStep("categories");
  }, []);

  const backToCategories = useCallback(() => {
    setError(null);
    setStep("categories");
  }, []);

  /** One-tap "Nothing meaningful has changed" — skips categories/details/
   * review/summary entirely, matching the approved fast path exactly. Also
   * the target of the Categories screen's own "Continue" when no_change is
   * the sole selection (see goToDetails below) — the same single
   * implementation serves both entry points, never a second one. */
  const submitNoChange = useCallback(async () => {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setError(null);
    setStep("creating");

    const userId = await resolveUserId();

    if (!userId) {
      setError("We couldn't find your account. Please try again.");
      setStep("entry");
      submittingRef.current = false;
      return;
    }

    const created = await createCareerCheckin(userId, {
      reports: [{ category: "no_change" }],
    });

    if (created.error || !created.data) {
      setError(created.error ?? "We couldn't save your check-in. Please try again.");
      setStep("entry");
      submittingRef.current = false;
      return;
    }

    setCheckin(created.data);
    setStep("saving");

    const saved = await saveCareerCheckinConfirmation(userId, {
      checkinId: created.data.id,
      decisions: [],
    });

    if (saved.error || !saved.data) {
      setError(saved.error ?? "We couldn't save your check-in. Please try again.");
      setStep("entry");
      submittingRef.current = false;
      return;
    }

    setConfirmation(saved.data);
    setStep("applying");
    setApplyInFlight(true);

    const applied = await applyCareerCheckinConfirmation(userId, created.data.id);

    submittingRef.current = false;
    setApplyInFlight(false);

    if (applied.error || !applied.data) {
      setError(applied.error ?? "We couldn't finish your check-in. Please try again.");
      // The confirmation row already exists and is safe — surface this as
      // a retryable apply failure (the Applying step doubles as the
      // results/retry view) rather than losing the flow entirely.
      setStep("applying");
      return;
    }

    setConfirmation(applied.data);
    setStep(applied.data.status === "completed" ? "complete" : "applying");
  }, [resolveUserId]);

  /**
   * The Categories screen's "Continue" action. When the sole selection is
   * `no_change` — mutually exclusive with every other category, per
   * toggleCategory — there is nothing for Details to collect: routes
   * straight through submitNoChange (the exact same fast path Entry's own
   * quiet action uses) rather than ever reaching Details, which would
   * otherwise render with zero category cards and let a stale "Continue"
   * submit an empty reports[] array (BLOCKER-1). Never a second no_change
   * implementation, never a change to createCareerCheckin's own validation.
   */
  const goToDetails = useCallback(() => {
    if (isNoChangeOnlySelection(selectedCategories)) {
      submitNoChange();
      return;
    }

    setError(null);
    setStep("details");
  }, [selectedCategories, submitNoChange]);

  const submitDetails = useCallback(async () => {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSavingInFlight(true);
    setError(null);
    setStep("creating");

    const userId = await resolveUserId();

    if (!userId) {
      setError("We couldn't find your account. Please try again.");
      setStep("details");
      submittingRef.current = false;
      setSavingInFlight(false);
      return;
    }

    const reports = buildReportsFromDrafts(selectedCategories, details);

    const created = await createCareerCheckin(userId, { reports });

    submittingRef.current = false;
    setSavingInFlight(false);

    if (created.error || !created.data) {
      setError(created.error ?? "We couldn't save your check-in. Please try again.");
      setStep("details");
      return;
    }

    setCheckin(created.data);
    await buildReviewState(created.data);
    setStep("review");
  }, [resolveUserId, selectedCategories, details, buildReviewState]);

  const updateReviewRow = useCallback(
    (reportIndex: number, patch: Partial<ReviewRow>) => {
      setReviewRows((rows) =>
        rows.map((row) => (row.reportIndex === reportIndex ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const canProceedFromReview = useMemo(
    () =>
      reviewRows.every(
        (row) =>
          row.decision !== null &&
          (row.decision !== "edited" || row.editedValue.trim().length > 0),
      ),
    [reviewRows],
  );

  const summary = useMemo(
    () => buildSummary(reviewRows, capabilityOptions),
    [reviewRows, capabilityOptions],
  );

  const submitReview = useCallback(async () => {
    if (submittingRef.current || !checkin) {
      return;
    }

    submittingRef.current = true;
    setSavingInFlight(true);
    setError(null);
    setStep("saving");

    const userId = await resolveUserId();

    if (!userId) {
      setError("We couldn't find your account. Please try again.");
      setStep("review");
      submittingRef.current = false;
      setSavingInFlight(false);
      return;
    }

    const decisions: CareerCheckinDecision[] = reviewRows.map(
      buildDecisionFromReviewRow,
    );

    const saved = await saveCareerCheckinConfirmation(userId, {
      checkinId: checkin.id,
      decisions,
    });

    submittingRef.current = false;
    setSavingInFlight(false);

    if (saved.error || !saved.data) {
      setError(saved.error ?? "We couldn't save your confirmation. Please try again.");
      setStep("review");
      return;
    }

    setConfirmation(saved.data);
    setStep("summary");
  }, [checkin, reviewRows, resolveUserId]);

  const runApply = useCallback(async () => {
    if (submittingRef.current || !checkin) {
      return;
    }

    submittingRef.current = true;
    setError(null);
    setStep("applying");
    setApplyInFlight(true);

    const userId = await resolveUserId();

    if (!userId) {
      setError("We couldn't find your account. Please try again.");
      setStep("summary");
      submittingRef.current = false;
      setApplyInFlight(false);
      return;
    }

    const applied = await applyCareerCheckinConfirmation(userId, checkin.id);

    submittingRef.current = false;
    setApplyInFlight(false);

    if (applied.error || !applied.data) {
      setError(applied.error ?? "We couldn't finish your check-in. Please try again.");
      setStep("applying");
      return;
    }

    setConfirmation(applied.data);

    setStep(applied.data.status === "completed" ? "complete" : "applying");
  }, [checkin, resolveUserId]);

  const retryApply = useCallback(() => {
    runApply();
  }, [runApply]);

  const reset = useCallback(() => {
    setStep("entry");
    setError(null);
    setSelectedCategories(new Set());
    setDetails({});
    setCheckin(null);
    setReviewRows([]);
    setCapabilityOptions([]);
    setConfirmation(null);
    setApplyInFlight(false);
    setSavingInFlight(false);
    submittingRef.current = false;
  }, []);

  /** Refreshes the shared UserContext (via useProfile's existing
   * reloadProfile) before returning to Home. Every other profile-mutating
   * flow in this app (app/(app)/profile.tsx) keeps UserContext in sync by
   * patching it directly at write time; this flow's writes happen inside
   * the Step 7 orchestrator instead, which has no knowledge of
   * UserContext (correctly — it is a pure backend service). Calling the
   * existing, already-exported reloadProfile here — using it exactly as
   * profile.tsx already does — is what makes Home's role/target/skill
   * display genuinely fresh on return, without adding any new refresh
   * mechanism. Next Move itself needs no such help: useDashboard's
   * existing focus effect re-reads CareerState live from the server
   * regardless of UserContext's own freshness. */
  const [returningHome, setReturningHome] = useState(false);

  const returnHome = useCallback(async () => {
    setReturningHome(true);
    await reloadProfile();
    router.replace("/dashboard");
  }, [reloadProfile]);

  return {
    step,
    error,
    userData,

    selectedCategories,
    toggleCategory,
    canProceedFromCategories,
    goToDetails,
    backToCategories,
    submitNoChange,

    details,
    setDetailField,
    canProceedFromDetails,
    submitDetails,

    checkin,
    reviewRows,
    updateReviewRow,
    canProceedFromReview,
    capabilityOptions,
    submitReview,
    savingInFlight,

    summary,
    runApply,
    applyInFlight,

    confirmation,
    retryApply,

    returnHome,
    returningHome,
    reset,
    goToCategories,
  };
}

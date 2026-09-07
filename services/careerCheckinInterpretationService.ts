import { CareerCheckin, CareerCheckinReport } from "../types/careerCheckin";
import {
  CareerCheckinInterpretation,
  CareerCheckinProposal,
} from "../types/careerCheckinInterpretation";

/**
 * Phase 10.1 Step 6 — deterministic Career Check-in interpretation.
 *
 * Pure, synchronous: no Supabase, no AsyncStorage, no AI, no network, no
 * Date.now()/Math.random(), no mutation of its input. Given the same
 * CareerCheckin, always returns the same CareerCheckinInterpretation. No
 * write of any kind happens here — not to profiles, not to
 * capability_evidence, not to career_journal, not to career_checkins
 * itself.
 *
 * Deliberately does not infer a missing role/skill/target value from free
 * text — per the approved Step 5 design, guessing from `description` is
 * explicitly out of scope for this step (reserved for a future,
 * still-unbuilt AI-assist layer). A report with no structured value is
 * "unresolved" here, never guessed at.
 */

/**
 * A structured field counts as present only once trimmed to something
 * non-empty — a whitespace-only value is treated exactly like null, never
 * turned into a blank proposal.
 */
function presentValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

interface ReportInterpretation {
  proposal: CareerCheckinProposal | null;
  unresolved: boolean;
}

/**
 * Interprets exactly one report in isolation — no report's interpretation
 * depends on any other report in the same check-in.
 */
function interpretReport(
  report: CareerCheckinReport,
  reportIndex: number,
): ReportInterpretation {
  switch (report.category) {
    case "role_change": {
      const proposedValue = presentValue(report.proposedCurrentRole);

      if (proposedValue === null) {
        return { proposal: null, unresolved: true };
      }

      return {
        proposal: {
          kind: "update_current_role",
          reportIndex,
          source: "user_reported",
          proposedValue,
        },
        unresolved: false,
      };
    }

    case "target_change": {
      const proposedValue = presentValue(report.proposedTargetRole);

      if (proposedValue === null) {
        return { proposal: null, unresolved: true };
      }

      return {
        proposal: {
          kind: "update_target_role",
          reportIndex,
          source: "user_reported",
          proposedValue,
        },
        unresolved: false,
      };
    }

    case "new_skill": {
      const skillName = presentValue(report.skillName);

      if (skillName === null) {
        return { proposal: null, unresolved: true };
      }

      return {
        proposal: {
          kind: "add_skill",
          reportIndex,
          source: "user_reported",
          skillName,
        },
        unresolved: false,
      };
    }

    case "new_evidence": {
      // Always actionable — the description itself is the entire
      // content, and no capability link is ever claimed here (Step 5
      // Q5/Q13: that choice belongs to a future confirmation UI, never to
      // this interpretation layer).
      return {
        proposal: {
          kind: "add_evidence",
          reportIndex,
          source: "user_reported",
          description: report.description,
        },
        unresolved: false,
      };
    }

    case "no_change":
      // Nothing to propose, nothing unresolved about an explicit
      // "nothing changed" — acknowledged only, via the original
      // CareerCheckin.reports a consumer already has in hand.
      return { proposal: null, unresolved: false };
  }
}

/**
 * Interprets one persisted CareerCheckin into proposals and unresolved
 * report indices — see types/careerCheckinInterpretation.ts for exactly
 * what each field does and does not mean.
 */
export function interpretCareerCheckin(
  checkin: CareerCheckin,
): CareerCheckinInterpretation {
  const proposals: CareerCheckinProposal[] = [];
  const unresolvedReportIndices: number[] = [];

  checkin.reports.forEach((report, reportIndex) => {
    const { proposal, unresolved } = interpretReport(report, reportIndex);

    if (proposal) {
      proposals.push(proposal);
    }

    if (unresolved) {
      unresolvedReportIndices.push(reportIndex);
    }
  });

  return {
    checkinId: checkin.id,
    proposals,
    unresolvedReportIndices,
  };
}

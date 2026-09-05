import { MonthRange, parseDurationRange } from "./roadmapService";
import { Roadmap, RoadmapStep } from "../types/roadmap";

/** One roadmap step, anchored to a calendar span. `startDate`/`endDate` are
 * both null when the roadmap has no usable per-step timing at all (e.g. a
 * catalogue-only roadmap, where every step's `estimatedTime` is null) —
 * callers must fall back to an order-only display rather than inventing a
 * date. */
export interface JourneyMilestone {
  step: RoadmapStep;
  order: number;
  startDate: Date | null;
  endDate: Date | null;
}

export interface JourneyTimeline {
  /** When this roadmap was actually generated — the day-zero every
   * milestone's span is measured from, so a roadmap opened weeks after it
   * was built correctly shows its earlier steps as already past rather than
   * restarting the clock on every visit. Falls back to `now` only for the
   * rare shape that predates `generatedAt` being recorded. */
  anchorDate: Date;

  milestones: JourneyMilestone[];

  /** Estimated arrival at the target role, or null alongside `hasDates`. */
  targetDate: Date | null;

  /** False whenever no step carries a parseable duration — the common case
   * for a catalogue-only roadmap. */
  hasDates: boolean;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const originalDay = result.getDate();

  result.setMonth(result.getMonth() + Math.round(months));

  // Guards against month-end overflow (e.g. Jan 31 + 1 month landing on Mar
  // 3 instead of Feb 28) rolling a milestone into the wrong month.
  if (result.getDate() < originalDay) {
    result.setDate(0);
  }

  return result;
}

function midpoint(range: MonthRange): number {
  return (range.min + range.max) / 2;
}

/**
 * Anchors a roadmap's steps to calendar dates, derived only from data the
 * roadmap already carries:
 *
 * - each step's own free-text `estimatedTime`, parsed with the exact same
 *   `parseDurationRange` buildJourneyEstimate itself uses — never a second,
 *   independently-invented duration for the same step;
 * - the roadmap's own already-honest, already-clamped `estimatedJourney`
 *   midpoint, which every milestone's span is scaled to land on exactly —
 *   so the calendar dates shown here can never imply a longer or shorter
 *   journey than the headline estimate the user already sees.
 *
 * A step with no usable duration of its own (common for AI steps that
 * omitted a time estimate) is given an equal share of whatever's left after
 * the known steps are accounted for, rather than being silently skipped or
 * assigned a guessed figure independent of the rest.
 */
export function buildJourneyTimeline(
  roadmap: Roadmap,
  now: Date = new Date(),
): JourneyTimeline {
  const anchorDate = roadmap.generatedAt ? new Date(roadmap.generatedAt) : now;
  const estimatedJourney = roadmap.estimatedJourney;

  const parsedDurations = roadmap.steps.map((step) =>
    parseDurationRange(step.estimatedTime),
  );

  const anyKnown = parsedDurations.some((range) => range !== null);

  if (!estimatedJourney || !anyKnown) {
    return {
      anchorDate,
      milestones: roadmap.steps.map((step) => ({
        step,
        order: step.order,
        startDate: null,
        endDate: null,
      })),
      targetDate: null,
      hasDates: false,
    };
  }

  const ownMonths = parsedDurations.map((range) =>
    range ? midpoint(range) : null,
  );

  const knownSum = ownMonths.reduce(
    (sum: number, value) => sum + (value ?? 0),
    0,
  );
  const unknownCount = ownMonths.filter((value) => value === null).length;

  const targetTotal =
    (estimatedJourney.minMonths + estimatedJourney.maxMonths) / 2;

  const remainderPerUnknown =
    unknownCount > 0
      ? Math.max(0.5, (targetTotal - knownSum) / unknownCount)
      : 0;

  const rawTotal = knownSum + remainderPerUnknown * unknownCount;

  // Rescales every step's own span so the sum lands exactly on targetTotal —
  // otherwise a headline shortened by the overlap heuristic in
  // buildJourneyEstimate would silently disagree with the sum of the spans
  // shown here.
  const scale = rawTotal > 0 ? targetTotal / rawTotal : 1;

  let cursor = 0;

  const milestones: JourneyMilestone[] = roadmap.steps.map((step, index) => {
    const own = ownMonths[index];
    const months = Math.max(0.25, (own ?? remainderPerUnknown) * scale);

    const startDate = addMonths(anchorDate, cursor);
    cursor += months;
    const endDate = addMonths(anchorDate, cursor);

    return { step, order: step.order, startDate, endDate };
  });

  return {
    anchorDate,
    milestones,
    targetDate: addMonths(anchorDate, cursor),
    hasDates: true,
  };
}

export type MilestoneVisualState = "past" | "current" | "upcoming";

/**
 * Purely time-based — there is no persisted "completed step" concept
 * anywhere in the app (deliberately: adding one would be gamification for
 * its own sake), so "past" vs "current" vs "upcoming" can only ever mean
 * "has this milestone's own estimated window already elapsed against the
 * real calendar." When no dates exist at all, the only honest fallback is
 * ordinal: the first step is the current one to work on, everything after
 * it is upcoming, and nothing can be claimed as past.
 */
export function resolveMilestoneState(
  milestone: JourneyMilestone,
  index: number,
  now: Date = new Date(),
): MilestoneVisualState {
  if (!milestone.startDate || !milestone.endDate) {
    return index === 0 ? "current" : "upcoming";
  }

  if (now.getTime() < milestone.startDate.getTime()) {
    return "upcoming";
  }

  if (now.getTime() > milestone.endDate.getTime()) {
    return "past";
  }

  return "current";
}

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/**
 * "OCT 2026" for anything within ~2 years, collapsing to just the year
 * ("2028") beyond that — matching the brief's own examples. A month-level
 * label that far out would overstate precision an estimate never claimed to
 * have.
 */
export function formatTimelineDate(date: Date, now: Date = new Date()): string {
  const monthsAway = Math.abs(
    (date.getFullYear() - now.getFullYear()) * 12 +
      (date.getMonth() - now.getMonth()),
  );

  if (monthsAway <= 24) {
    return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
  }

  return `${date.getFullYear()}`;
}

/**
 * Labels one node for the sticky date pill, using the same 0=start,
 * 1..N=milestone, N+1=target indexing JourneyPath reports scroll position
 * with. Null whenever the roadmap has no calendar anchoring at all, so the
 * pill can hide itself rather than show a meaningless placeholder.
 */
export function describeTimelineNode(
  timeline: JourneyTimeline,
  index: number,
  now: Date = new Date(),
): string | null {
  if (!timeline.hasDates) {
    return null;
  }

  if (index === 0) {
    return "TODAY";
  }

  const milestoneIndex = index - 1;

  if (milestoneIndex < timeline.milestones.length) {
    const milestone = timeline.milestones[milestoneIndex];

    return milestone.startDate
      ? formatTimelineDate(milestone.startDate, now)
      : null;
  }

  return timeline.targetDate
    ? formatTimelineDate(timeline.targetDate, now)
    : null;
}

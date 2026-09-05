import { RoadmapJourneyEstimate } from "../types/roadmap";

/**
 * The single shared implementation of the journey-estimate headline, used by
 * both Home (JourneySummaryCard) and Journey (timeline.tsx) — extracted here
 * in Phase 4 so the two screens can never visually disagree about the same
 * estimate. Previously this was duplicated (see git history); if you're
 * tempted to add a second copy for a third call site, import this instead.
 */
const CEILING_MONTHS = 60;
const CEILING_YEARS = CEILING_MONTHS / 12;

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function formatBound(months: number): { value: number; unit: "month" | "year" } {
  return months < 12
    ? { value: months, unit: "month" }
    : { value: Math.round(months / 12), unit: "year" };
}

/** Same headline shown in Career Timeline's journey estimate card — see
 * that file's formatJourneyHeadline for the full rationale of each branch. */
export function formatJourneyHeadline(minMonths: number, maxMonths: number): string {
  if (maxMonths < 18) {
    return minMonths === maxMonths
      ? pluralize(minMonths, "month")
      : `${minMonths}-${maxMonths} months`;
  }

  const openEnded = maxMonths > CEILING_MONTHS;
  const min = formatBound(minMonths);

  if (openEnded) {
    return min.unit === "year"
      ? min.value >= CEILING_YEARS
        ? `${CEILING_YEARS}+ years`
        : `${min.value}-${CEILING_YEARS}+ years`
      : `${pluralize(minMonths, "month")}–${CEILING_YEARS}+ years`;
  }

  const max = formatBound(maxMonths);

  if (min.unit === max.unit) {
    return min.value === max.value
      ? pluralize(min.value, min.unit)
      : `${min.value}-${max.value} ${max.unit}s`;
  }

  return `${pluralize(minMonths, "month")}–${pluralize(max.value, "year")}`;
}

/** Null when there's no roadmap-derived estimate yet — callers must render
 * an honest "no roadmap yet" state rather than a guess. */
export function formatEstimatedJourney(
  estimate: RoadmapJourneyEstimate | null,
): string | null {
  if (!estimate) {
    return null;
  }

  return formatJourneyHeadline(estimate.minMonths, estimate.maxMonths);
}

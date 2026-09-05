import { RoadmapJourneyEstimate } from "../types/roadmap";

/**
 * Deliberately duplicated from app/(app)/timeline.tsx's private formatting
 * functions rather than imported — Home (Phase 2) must not modify Journey
 * (out of scope this phase), and this formatting was never exported. Keeping
 * the exact same ceiling/rounding rules here means Home and Journey can never
 * visually disagree about the same estimate, even though the source is
 * duplicated. When Journey is rebuilt (Phase 4), extract both call sites to
 * a single shared module instead of carrying this duplication forward.
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

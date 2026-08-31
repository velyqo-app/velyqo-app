import { CatalogueOccupation } from "../types/occupation";
import { RoadmapSalary } from "../types/roadmap";
import { getOccupationsByCategory } from "./occupationService";
import { rankOf } from "./occupationLevelService";
import { loadSalary, resolveEndpoint } from "./roadmapService";

/**
 * How a requested target salary compares to the verified market range for
 * the requested target role.
 *
 * `unsupported` is the honest default whenever there is nothing to compare
 * against — it must never be upgraded to a real classification just because
 * a number was entered. Only `above_range` triggers the destination-decision
 * flow; the other three are informational.
 */
export type SalaryRealism =
  | "unsupported"
  | "below_range"
  | "within_range"
  | "above_range";

export interface SalaryConflictCheck {
  /** True only when a real occupation_salary_bands row was found. */
  hasVerifiedData: boolean;

  /** The verified band itself, or null — never a guessed figure. */
  band: RoadmapSalary | null;

  realism: SalaryRealism;

  /** Shorthand for `realism === "above_range"` — the only state that should
   * ever surface a decision to the user. */
  conflict: boolean;

  /** The resolved target occupation, or null if it isn't catalogued. */
  targetOccupation: CatalogueOccupation | null;

  /**
   * Same-category catalogue occupations ranked above the target, ordered by
   * seniority. Deterministic and DB-only — AI-suggested candidates are a
   * separate, later step. Empty whenever the target isn't catalogued or
   * nothing ranks above it, which is expected far more often than not given
   * today's catalogue size.
   */
  advancedCandidates: CatalogueOccupation[];
}

/**
 * Classifies a requested target salary against a verified band.
 *
 * `unsupported` whenever either side of the comparison is missing — there is
 * no code path that produces `below_range`/`within_range`/`above_range`
 * without a real band, so a conflict can never be claimed from absent data.
 */
export function classifySalaryRealism(
  targetSalary: number | null,
  band: RoadmapSalary | null,
): SalaryRealism {
  if (!band || targetSalary === null) {
    return "unsupported";
  }

  if (targetSalary < band.low) {
    return "below_range";
  }

  if (targetSalary > band.high) {
    return "above_range";
  }

  return "within_range";
}

/**
 * Same-category catalogue occupations ranked above the given one, in
 * seniority order. Mirrors roadmapService's buildLadder, but searching
 * upward from the target rather than from the current role — this is the
 * "find a more senior version of this profession" half of the mechanism,
 * buildLadder is the "steps between here and there" half.
 *
 * Empty when the occupation's level can't be ranked, or when nothing in the
 * catalogue outranks it — never invented.
 */
export async function findAdvancedCandidates(
  target: CatalogueOccupation,
): Promise<CatalogueOccupation[]> {
  const targetRank = rankOf(target.level);

  if (targetRank === null) {
    return [];
  }

  const peers = await getOccupationsByCategory(target.category);

  return peers
    .filter((peer) => {
      const rank = rankOf(peer.level);

      return rank !== null && rank > targetRank;
    })
    .sort((a, b) => (rankOf(a.level) ?? 0) - (rankOf(b.level) ?? 0));
}

/**
 * The full deterministic check: does the requested target salary exceed the
 * verified range for the requested target role, and if so, what (if
 * anything) does the catalogue itself offer as a more senior alternative.
 *
 * No AI involved. Never throws — a resolution failure degrades to
 * `unsupported` rather than blocking the caller.
 */
export async function checkSalaryConflict(
  targetRole: string,
  targetOccupationId: string | null,
  targetSalary: number | null,
  countryCode: string | null,
): Promise<SalaryConflictCheck> {
  const targetOccupation = await resolveEndpoint(targetRole, targetOccupationId);

  const band = await loadSalary(targetOccupation?.id ?? null, countryCode);

  const realism = classifySalaryRealism(targetSalary, band);

  const conflict = realism === "above_range";

  const advancedCandidates =
    conflict && targetOccupation
      ? await findAdvancedCandidates(targetOccupation)
      : [];

  return {
    hasVerifiedData: band !== null,
    band,
    realism,
    conflict,
    targetOccupation,
    advancedCandidates,
  };
}

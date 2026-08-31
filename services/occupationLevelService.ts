/**
 * Seniority ordering for `occupations.level`.
 *
 * The database has an `experience_levels` table with a `sort_order` column,
 * which would be the natural home for this, but it is empty — so ranking lives
 * here instead. This orders roles that already exist in the catalogue; it never
 * invents a role. Levels absent from this map are treated as unrankable and
 * excluded from the ladder rather than guessed at.
 *
 * Extracted out of roadmapService so the destination-resolution work in
 * Phase 4 (finding a more senior version of a role) can rank occupations the
 * same way the roadmap ladder already does, without a second copy of this
 * table drifting out of sync with the first.
 */
const LEVEL_RANK: Record<string, number> = {
  intern: 10,
  entry: 20,
  junior: 30,
  associate: 40,
  mid: 50,
  senior: 60,
  lead: 70,
  principal: 80,
  manager: 90,
  "senior manager": 100,
  head: 110,
  director: 120,
  vp: 130,
  executive: 140,
};

/** Null for an unset or unrecognised level — never guessed. */
export function rankOf(level: string | null): number | null {
  if (!level) {
    return null;
  }

  return LEVEL_RANK[level.trim().toLowerCase()] ?? null;
}

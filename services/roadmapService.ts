import { CatalogueOccupation } from "../types/occupation";
import {
  Roadmap,
  RoadmapEndpoint,
  RoadmapGeneration,
  RoadmapLimitation,
  RoadmapSalary,
  RoadmapStep,
} from "../types/roadmap";
import {
  getOccupationById,
  getOccupationsByCategory,
  resolveOccupationByTitle,
} from "./occupationService";
import { generateRoadmap } from "./roadmapGenerationService";
import { SalaryBand, getSalaryBands } from "./salaryService";

export interface RoadmapInput {
  currentRole: string;
  currentOccupationId: string | null;
  currentSalary: number | null;

  targetRole: string;
  targetOccupationId: string | null;
  targetSalary: number | null;

  /** ISO code for the salary lookup. Null skips salary entirely. */
  countryCode: string | null;

  /** Display name, used to give the generator geographic context. */
  country: string | null;

  /** The user's stated goal from onboarding. */
  purpose: string | null;
}

/**
 * Seniority ordering for `occupations.level`.
 *
 * The database has an `experience_levels` table with a `sort_order` column,
 * which would be the natural home for this, but it is empty — so ranking lives
 * here instead. This orders roles that already exist in the catalogue; it never
 * invents a role. Levels absent from this map are treated as unrankable and
 * excluded from the ladder rather than guessed at.
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

function rankOf(level: string | null): number | null {
  if (!level) {
    return null;
  }

  return LEVEL_RANK[level.trim().toLowerCase()] ?? null;
}

function toRoadmapSalary(band: SalaryBand): RoadmapSalary {
  return {
    currency: band.currency,
    low: band.low_salary,
    median: band.median_salary,
    high: band.high_salary,
    confidence: band.confidence,
    source: band.source,
    sourceUrl: band.source_url,
    dataType: band.data_type,
  };
}

/**
 * Verified market salary for one occupation, or null when the database has
 * none. Never falls back to another role's figure.
 */
async function loadSalary(
  occupationId: string | null,
  countryCode: string | null,
): Promise<RoadmapSalary | null> {
  if (!occupationId || !countryCode) {
    return null;
  }

  try {
    const { data, error } = await getSalaryBands(occupationId, countryCode);

    if (error || !data || data.length === 0) {
      return null;
    }

    // Experience-level bands are unusable while `experience_levels` is empty,
    // so prefer the occupation-wide band and fall back to whatever exists.
    const band = data.find((candidate) => candidate.scope === "OCCUPATION") ?? data[0];

    return band ? toRoadmapSalary(band) : null;
  } catch {
    return null;
  }
}

/** Uses the stored id when we have one, otherwise recovers it from the title. */
async function resolveEndpoint(
  title: string,
  occupationId: string | null,
): Promise<CatalogueOccupation | null> {
  if (occupationId) {
    return await getOccupationById(occupationId);
  }

  const resolved = await resolveOccupationByTitle(title);

  if (!resolved) {
    return null;
  }

  return {
    id: resolved.id,
    title: resolved.title,
    category: resolved.category,
    level: resolved.level,
  };
}

/**
 * Roles in the target's category ranked strictly above the current role and up
 * to the target, in seniority order. Empty when the catalogue cannot support a
 * ladder.
 */
async function buildLadder(
  current: CatalogueOccupation | null,
  target: CatalogueOccupation,
): Promise<CatalogueOccupation[]> {
  const targetRank = rankOf(target.level);

  if (targetRank === null) {
    return [];
  }

  const peers = await getOccupationsByCategory(target.category);

  const currentRank =
    current && current.category === target.category
      ? rankOf(current.level)
      : null;

  // With no usable current rank, show everything up to the target rather than
  // assuming where the user sits.
  const floor = currentRank ?? -1;

  return peers
    .filter((peer) => {
      const rank = rankOf(peer.level);

      return rank !== null && rank > floor && rank <= targetRank;
    })
    .sort((a, b) => (rankOf(a.level) ?? 0) - (rankOf(b.level) ?? 0));
}

/**
 * Builds a career roadmap from current role to target role.
 *
 * Progression and salary come only from the database. Where the catalogue has
 * nothing — which is the common case today — the roadmap still returns both
 * endpoints and records why it is thin in `limitations`, so the UI can be
 * honest instead of filling the gap with generic content.
 *
 * Never throws; a failure degrades to the endpoints-only roadmap.
 */
export async function buildRoadmap(input: RoadmapInput): Promise<Roadmap> {
  const limitations: RoadmapLimitation[] = [];

  const [currentOccupation, targetOccupation] = await Promise.all([
    resolveEndpoint(input.currentRole, input.currentOccupationId),
    resolveEndpoint(input.targetRole, input.targetOccupationId),
  ]);

  if (!currentOccupation) {
    limitations.push("CURRENT_ROLE_NOT_IN_CATALOGUE");
  }

  if (!targetOccupation) {
    limitations.push("TARGET_ROLE_NOT_IN_CATALOGUE");
  }

  if (!input.countryCode) {
    limitations.push("NO_COUNTRY");
  }

  if (
    (currentOccupation && rankOf(currentOccupation.level) === null) ||
    (targetOccupation && rankOf(targetOccupation.level) === null)
  ) {
    limitations.push("UNKNOWN_LEVEL");
  }

  const ladder = targetOccupation
    ? await buildLadder(currentOccupation, targetOccupation)
    : [];

  if (targetOccupation && ladder.length === 0) {
    limitations.push("NO_LADDER_DATA");
  }

  const [currentSalary, targetSalary, ladderSalaries] = await Promise.all([
    loadSalary(currentOccupation?.id ?? null, input.countryCode),
    loadSalary(targetOccupation?.id ?? null, input.countryCode),
    Promise.all(
      ladder.map((rung) => loadSalary(rung.id, input.countryCode)),
    ),
  ]);

  const catalogueSteps: RoadmapStep[] = ladder.map((rung, index) => ({
    id: rung.id,
    order: index + 1,
    title: rung.title,
    description: "",
    rationale: "",
    level: rung.level,
    salary: ladderSalaries[index],
    skills: [],
    actions: [],
    estimatedTime: null,
    source: "catalogue",
  }));

  const hasAnySalary =
    Boolean(currentSalary) ||
    Boolean(targetSalary) ||
    ladderSalaries.some(Boolean);

  if (!hasAnySalary && !limitations.includes("NO_COUNTRY")) {
    limitations.push("NO_SALARY_DATA");
  }

  const current: RoadmapEndpoint = {
    title: currentOccupation?.title ?? input.currentRole,
    occupationId: currentOccupation?.id ?? null,
    level: currentOccupation?.level ?? null,
    salary: currentSalary,
    statedSalary: input.currentSalary,
  };

  const target: RoadmapEndpoint = {
    title: targetOccupation?.title ?? input.targetRole,
    occupationId: targetOccupation?.id ?? null,
    level: targetOccupation?.level ?? null,
    salary: targetSalary,
    statedSalary: input.targetSalary,
  };

  // The catalogue holds a handful of occupations, so generated steps are the
  // primary source of progression for almost every real transition. The
  // database stays authoritative for salary.
  const generated = await generateRoadmap({
    currentRole: current.title,
    targetRole: target.title,
    country: input.country,
    currentSalary: input.currentSalary,
    targetSalary: input.targetSalary,
    purpose: input.purpose,
    knownLadder: ladder.map((rung) => rung.title),
  });

  const salaryByTitle = buildSalaryLookup(
    ladder.map((rung, index) => [rung.title, ladderSalaries[index]]),
    target,
  );

  const steps: RoadmapStep[] = generated
    ? generated.steps.map((step, index) => ({
        id: `ai:${index + 1}`,
        order: index + 1,
        title: step.title,
        description: step.description,
        rationale: step.rationale,
        level: null,

        // Only ever a database figure, matched by title. Never from the model.
        salary: salaryByTitle.get(step.title.trim().toLowerCase()) ?? null,

        skills: step.skills,
        actions: step.actions,
        estimatedTime: step.estimatedTime || null,
        source: "ai",
      }))
    : catalogueSteps;

  if (!generated) {
    limitations.push("AI_UNAVAILABLE");
  }

  // A generated roadmap supplies the progression the catalogue could not, so
  // the missing-ladder warning would be misleading.
  const resolvedLimitations =
    generated && steps.length > 0
      ? limitations.filter((limitation) => limitation !== "NO_LADDER_DATA")
      : limitations;

  const generation: RoadmapGeneration = generated
    ? "ai"
    : steps.length > 0
      ? "catalogue"
      : "endpoints-only";

  return {
    current,
    target,
    steps,
    summary: generated?.summary ?? null,
    transferableSkills: generated?.transferableSkills ?? [],
    generation,
    generatedAt: new Date().toISOString(),
    limitations: resolvedLimitations,
    nextAction: buildNextAction(current, target, steps),
  };
}

/**
 * Title-keyed salary lookup, so a generated step naming a real occupation
 * still shows verified data. Titles with no band are simply absent.
 */
function buildSalaryLookup(
  ladderEntries: [string, RoadmapSalary | null][],
  target: RoadmapEndpoint,
): Map<string, RoadmapSalary> {
  const lookup = new Map<string, RoadmapSalary>();

  ladderEntries.forEach(([title, salary]) => {
    if (salary) {
      lookup.set(title.trim().toLowerCase(), salary);
    }
  });

  if (target.salary) {
    lookup.set(target.title.trim().toLowerCase(), target.salary);
  }

  return lookup;
}

function buildNextAction(
  current: RoadmapEndpoint,
  target: RoadmapEndpoint,
  steps: RoadmapStep[],
): string | null {
  const nextStep = steps[0];

  if (nextStep && nextStep.title !== current.title) {
    return `Work towards ${nextStep.title}`;
  }

  if (target.title) {
    return `Work towards ${target.title}`;
  }

  return null;
}

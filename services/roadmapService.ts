import { CatalogueOccupation } from "../types/occupation";
import {
  Roadmap,
  RoadmapEndpoint,
  RoadmapGeneration,
  RoadmapJourneyEstimate,
  RoadmapLimitation,
  RoadmapSalary,
  RoadmapStep,
} from "../types/roadmap";
import {
  getOccupationById,
  getOccupationsByCategory,
  resolveOccupationByTitle,
} from "./occupationService";
import { toCurrencyCode } from "./countryService";
import { rankOf } from "./occupationLevelService";
import { generateRoadmap } from "./roadmapGenerationService";
import { SalaryBand, getSalaryBands } from "./salaryService";
import {
  EducationLevel,
  ExperienceLevel,
  SalaryPriority,
  StartingSituation,
  TargetTimeframe,
} from "../types/careerContext";

/**
 * Set only when the user has already been shown a confirmed salary conflict
 * (destinationResolutionService) and chosen "salary" or "balance" over their
 * originally requested role. Redirects buildRoadmap's target for this one
 * call, while `requestedTitle`/`requestedSalary` are preserved so the
 * returned Roadmap can honestly show what was actually asked for.
 *
 * Never constructed from an invented title — `title`/`occupationId` must
 * come from either a catalogue occupation or an AI-suggested title that was
 * itself only offered after a real conflict was confirmed.
 */
export interface DestinationOverride {
  title: string;
  occupationId: string | null;
  priority: SalaryPriority;
  requestedTitle: string;
  requestedSalary: number | null;

  /** The AI's qualitative reasoning, or null if that call was unavailable. */
  explanation: string | null;
}

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

  /** "" on a profile that predates this phase — the prompt degrades to the
   * original Phase 2 framing when any of these are unset. */
  startingSituation: StartingSituation | "";
  experienceLevel: ExperienceLevel | "";
  educationLevel: EducationLevel | "";
  skills: string[];
  targetTimeframe: TargetTimeframe | "";

  /** Redirects generation toward a resolved destination — see
   * DestinationOverride. Absent or null means "target exactly what was
   * requested," which is the default and by far the common case. */
  destinationOverride?: DestinationOverride | null;
}

interface MonthRange {
  min: number;
  max: number;
}

const MONTHS_PER_UNIT: Record<string, number> = {
  week: 1 / 4.345,
  weeks: 1 / 4.345,
  month: 1,
  months: 1,
  year: 12,
  years: 12,
};

/**
 * Parses a step's free-text duration (e.g. "3-6 months", "1-2 years") into a
 * month range. Returns null for anything that doesn't match the shape the
 * prompt asks for, rather than guessing at a malformed value.
 */
function parseDurationRange(text: string | null): MonthRange | null {
  if (!text) {
    return null;
  }

  const match = text
    .trim()
    .toLowerCase()
    .match(
      /^~?\s*(\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)\s*(week|weeks|month|months|year|years)\b|^~?\s*(\d+(?:\.\d+)?)\s*(week|weeks|month|months|year|years)\b/,
    );

  if (!match) {
    return null;
  }

  // Two alternatives in the pattern above: a "min-max unit" range, or a
  // single "n unit" value in the second half of the alternation.
  if (match[3]) {
    const unit = MONTHS_PER_UNIT[match[3]];

    const min = parseFloat(match[1]) * unit;
    const max = parseFloat(match[2]) * unit;

    return min <= max ? { min, max } : { min: max, max: min };
  }

  const unit = MONTHS_PER_UNIT[match[5]];
  const value = parseFloat(match[4]) * unit;

  return { min: value, max: value };
}

/**
 * Bounds and, where possible, the AI's own reasoning about overlap, combined
 * into one honest total.
 *
 * The AI's estimate is never trusted outright — it is clamped so it can never
 * be shorter than the roadmap's single longest step, nor longer than adding
 * every step up sequentially. Both bounds come only from the steps actually
 * on screen, so the total can never contradict what the user can already see
 * and can never be a number invented independently of the roadmap.
 */
function buildJourneyEstimate(
  steps: RoadmapStep[],
  aiEstimatedJourney: string | null,
): RoadmapJourneyEstimate | null {
  const parsed = steps
    .map((step) => parseDurationRange(step.estimatedTime))
    .filter((range): range is MonthRange => range !== null);

  if (parsed.length === 0) {
    return null;
  }

  const sequentialMin = parsed.reduce((sum, range) => sum + range.min, 0);
  const sequentialMax = parsed.reduce((sum, range) => sum + range.max, 0);
  const longestStepMin = Math.max(...parsed.map((range) => range.min));

  // A floor of just the longest single step let the AI report implausibly
  // short totals (e.g. "1-2 years" for four sequential-sounding role changes
  // that individually sum to well over that). Never let overlap reasoning
  // claim more than half the naive sequential minimum back — a disclosed
  // heuristic, not verified data, chosen to stop implausible under-estimates
  // without pretending overlap can't meaningfully shorten a journey at all.
  const lowerBound = Math.max(longestStepMin, sequentialMin * 0.5);
  const upperBound = sequentialMax;

  const aiRange = parseDurationRange(aiEstimatedJourney);

  const clamp = (value: number) =>
    Math.min(upperBound, Math.max(lowerBound, value));

  let minMonths = lowerBound;
  let maxMonths = upperBound;

  if (aiRange) {
    const clampedMin = clamp(aiRange.min);
    const clampedMax = clamp(aiRange.max);

    if (clampedMin <= clampedMax) {
      minMonths = clampedMin;
      maxMonths = clampedMax;
    }
    // An inverted result after clamping means the AI's figure didn't fit its
    // own steps — fall back to the sequential bounds already assigned above
    // rather than show something inconsistent with them.
  } else {
    // No usable AI estimate — the honest fallback is the sequential range
    // itself, i.e. what a straight sum of the visible steps would show.
    minMonths = sequentialMin;
    maxMonths = sequentialMax;
  }

  // A defensive floor, not a fabricated duration: a step reporting "0
  // months" (or every step doing so) must never surface as a 0-month — or
  // negative, were rounding ever to produce one — journey on screen. 1 is
  // the smallest unit this estimate is ever expressed in.
  const roundedMin = Math.max(1, Math.round(minMonths));
  const roundedMax = Math.max(roundedMin, Math.round(maxMonths));

  return {
    minMonths: roundedMin,
    maxMonths: roundedMax,
    stepsCounted: parsed.length,
    stepsTotal: steps.length,
  };
}

/**
 * A row that fails these checks is malformed, not merely low-quality — a
 * negative, zero, or inverted (low > high) figure is never a real salary and
 * must never reach the UI as if it were a verified one. Single choke point so
 * every renderer of RoadmapSalary is protected without repeating the check.
 */
function isSaneBand(band: SalaryBand): boolean {
  return (
    band.low_salary > 0 &&
    band.median_salary > 0 &&
    band.high_salary > 0 &&
    band.low_salary <= band.median_salary &&
    band.median_salary <= band.high_salary
  );
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
 *
 * Exported so destinationResolutionService can reuse the exact same lookup
 * (including the isSaneBand guard) rather than a second copy of it.
 */
export async function loadSalary(
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

    if (!band || !isSaneBand(band)) {
      return null;
    }

    return toRoadmapSalary(band);
  } catch {
    return null;
  }
}

/**
 * Uses the stored id when we have one, otherwise recovers it from the title.
 *
 * Exported so destinationResolutionService can resolve the target occupation
 * the same way the roadmap itself does, rather than a second copy of it.
 */
export async function resolveEndpoint(
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

  const override = input.destinationOverride ?? null;

  // When an override is present, every resolution/ladder/salary/generation
  // step below targets it instead of the raw request — the same mechanism
  // that already handles a free-text target, just fed a different
  // title/id. The original request is preserved in `override` so it can be
  // recorded in the returned Roadmap's destinationResolution, never lost.
  const effectiveTargetRole = override?.title ?? input.targetRole;
  const effectiveTargetOccupationId =
    override?.occupationId ?? input.targetOccupationId;

  const [currentOccupation, targetOccupation] = await Promise.all([
    resolveEndpoint(input.currentRole, input.currentOccupationId),
    resolveEndpoint(effectiveTargetRole, effectiveTargetOccupationId),
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

  // Both endpoints share the user's one country, so this is computed once.
  const statedCurrency = toCurrencyCode(input.countryCode);

  const current: RoadmapEndpoint = {
    title: currentOccupation?.title ?? input.currentRole,
    occupationId: currentOccupation?.id ?? null,
    level: currentOccupation?.level ?? null,
    salary: currentSalary,
    statedSalary: input.currentSalary,
    currency: statedCurrency,
  };

  const target: RoadmapEndpoint = {
    // Falls back to the resolved (possibly overridden) title, never the raw
    // request — if the override named a role outside the catalogue, this is
    // what makes that title actually show up as the target.
    title: targetOccupation?.title ?? effectiveTargetRole,
    occupationId: targetOccupation?.id ?? null,
    level: targetOccupation?.level ?? null,
    salary: targetSalary,
    statedSalary: input.targetSalary,
    currency: statedCurrency,
  };

  const destinationNote = override
    ? `IMPORTANT CONTEXT: this person originally asked about "${override.requestedTitle}"${
        override.requestedSalary
          ? ` with a target salary of ${override.requestedSalary}`
          : ""
      }. A confirmed salary comparison showed that target may need a more
senior role, and they chose to ${
        override.priority === "salary"
          ? "prioritise reaching their salary target"
          : "balance salary and time"
      } — so this roadmap targets "${effectiveTargetRole}" instead of their
original request.${override.explanation ? ` Context: ${override.explanation}` : ""}`
    : null;

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
    startingSituation: input.startingSituation,
    experienceLevel: input.experienceLevel,
    educationLevel: input.educationLevel,
    skills: input.skills,
    targetTimeframe: input.targetTimeframe,
    destinationNote,
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

    destinationResolution: override
      ? {
          requestedTitle: override.requestedTitle,
          requestedSalary: override.requestedSalary,
          priority: override.priority,
          explanation: override.explanation,
        }
      : null,

    steps,
    summary: generated?.summary ?? null,
    transferableSkills: generated?.transferableSkills ?? [],

    // Display-only — never touches `target`, never auto-selected.
    alternativeCareers: generated?.alternativeCareers ?? [],

    // AI-asserted, not database-verified — the UI must label it as such.
    regulatoryConsiderations: generated?.regulatoryConsiderations ?? [],

    // Bounded by the steps themselves — see buildJourneyEstimate.
    estimatedJourney: buildJourneyEstimate(
      steps,
      generated?.estimatedJourney ?? null,
    ),

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

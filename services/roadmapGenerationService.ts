import { askAIRaw } from "./aiProvider";
import { RoadmapPromptInput, buildRoadmapPrompt } from "./promptBuilderService";

/** One step exactly as the model is asked to return it — no salary fields. */
export interface GeneratedStep {
  title: string;
  description: string;
  skills: string[];
  actions: string[];
  estimatedTime: string;
  rationale: string;
}

export interface GeneratedAlternativeCareer {
  title: string;
  whySuitable: string;
}

export interface GeneratedRoadmap {
  summary: string;
  transferableSkills: string[];
  regulatoryConsiderations: string[];

  /** Display-only suggestions, never a substitute for the requested target —
   * see roadmapService, which attaches these without touching `target`. */
  alternativeCareers: GeneratedAlternativeCareer[];

  /**
   * The AI's own estimate of total time, reasoning about overlap between
   * steps rather than a blind sum. Null when absent or malformed — the
   * caller falls back to its own bounds computed from the step estimates.
   */
  estimatedJourney: string | null;

  steps: GeneratedStep[];
}

const MIN_STEPS = 2;
const MAX_STEPS = 8;
const MAX_ALTERNATIVE_CAREERS = 4;

/** A trivially short reason is indistinguishable from no reason at all. */
const MIN_WHY_SUITABLE_LENGTH = 15;

/**
 * Phrasings copied from the old hardcoded roadmap. Their presence means the
 * model produced boilerplate rather than something specific to this person.
 */
const GENERIC_TITLES = [
  "learn key skills",
  "complete certifications",
  "build practical experience",
  "apply for opportunities",
  "gain experience",
  "improve your skills",
];

/**
 * Pulls the first balanced JSON object out of a reply.
 *
 * The edge function has no structured-output mode, so replies may arrive
 * wrapped in code fences or with surrounding prose.
 *
 * Exported so destinationAssessmentService can parse its own, differently
 * shaped, AI reply without a second copy of this.
 */
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Removes leading numbering from a generated title.
 *
 * The prompt forbids it, but the model still adds "Step 1 - " often enough to
 * matter, and the card already renders its own "STEP 1" label. Both patterns
 * require a digit, so titles like "Step into leadership" or "3D Design Lead"
 * are left alone.
 */
export function stripStepPrefix(title: string): string {
  return title
    .trim()
    .replace(/^(?:step|phase|stage)\s*\d+\s*[-–—:.)]*\s*/i, "")
    .replace(/^\d+\s*[-–—:.)]\s*/, "")
    .trim();
}

function isGenericTitle(title: string): boolean {
  const normalised = title.trim().toLowerCase();

  return GENERIC_TITLES.some((generic) => normalised === generic);
}

/**
 * Validates one step. Salary-shaped fields are simply not read, so anything
 * the model invents there is dropped rather than trusted.
 */
function parseStep(raw: unknown): GeneratedStep | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  if (
    !isNonEmptyString(candidate.title) ||
    !isNonEmptyString(candidate.description) ||
    !isNonEmptyString(candidate.rationale)
  ) {
    return null;
  }

  const title = stripStepPrefix(candidate.title);

  if (!title || isGenericTitle(title)) {
    return null;
  }

  return {
    title,
    description: candidate.description.trim(),
    rationale: candidate.rationale.trim(),
    skills: toStringArray(candidate.skills),
    actions: toStringArray(candidate.actions),
    estimatedTime: isNonEmptyString(candidate.estimatedTime)
      ? candidate.estimatedTime.trim()
      : "",
  };
}

/**
 * Validates one alternative-career suggestion. A missing or trivially short
 * "whySuitable" is treated the same as no reason at all — display-only
 * suggestions still need to earn their place, not pad out a count.
 */
function parseAlternativeCareer(
  raw: unknown,
): GeneratedAlternativeCareer | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  if (!isNonEmptyString(candidate.title) || !isNonEmptyString(candidate.whySuitable)) {
    return null;
  }

  const whySuitable = candidate.whySuitable.trim();

  if (whySuitable.length < MIN_WHY_SUITABLE_LENGTH) {
    return null;
  }

  return {
    title: candidate.title.trim(),
    whySuitable,
  };
}

/**
 * Parses the alternativeCareers array, dropping anything that's really just
 * the requested target under a different name — the model is told not to
 * repeat it, but this is the structural backstop.
 */
function parseAlternativeCareers(
  raw: unknown,
  targetRole: string,
): GeneratedAlternativeCareer[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const targetNormalised = targetRole.trim().toLowerCase();

  return raw
    .map(parseAlternativeCareer)
    .filter((career): career is GeneratedAlternativeCareer => career !== null)
    .filter((career) => career.title.trim().toLowerCase() !== targetNormalised)
    .slice(0, MAX_ALTERNATIVE_CAREERS);
}

// Stripped only when trimming a word down to this length still leaves a
// meaningful stem — a deliberately loose heuristic, not a real stemmer. Its
// job is to stop paraphrasing ("Accountant" -> "accounting", "Analyst" ->
// "analytics") from failing a check that a human would consider satisfied.
const WORD_SUFFIXES = ["ing", "ers", "ant", "ent", "es", "er", "or", "s"];

function normaliseWord(word: string): string {
  for (const suffix of WORD_SUFFIXES) {
    if (word.length > suffix.length + 3 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}

function significantWords(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];

  return new Set(words.filter((word) => word.length >= 4).map(normaliseWord));
}

/**
 * Rejects a roadmap whose summary could belong to anybody — the summary must
 * genuinely be about this transition, not just contain the exact role
 * strings verbatim.
 *
 * The original version required an exact substring match, which rejected
 * perfectly good roadmaps over trivial paraphrasing (the model writing
 * "accounting" instead of "Accountant"). This instead requires most of each
 * role's significant words to appear, in normalised form, which tolerates
 * that kind of paraphrase without dropping the check that catches a
 * genuinely generic, could-belong-to-anyone summary.
 */
function mentionsBothRoles(
  summary: string,
  currentRole: string,
  targetRole: string,
): boolean {
  const summaryWords = significantWords(summary);

  const roleIsMentioned = (role: string): boolean => {
    const roleWords = Array.from(significantWords(role));

    // A role with no significant words (all short connectors) can't be
    // meaningfully checked — don't fail the roadmap over that.
    if (roleWords.length === 0) {
      return true;
    }

    const matched = roleWords.filter((word) => summaryWords.has(word));

    return matched.length >= Math.ceil(roleWords.length / 2);
  };

  return roleIsMentioned(currentRole) && roleIsMentioned(targetRole);
}

/**
 * Either the parsed roadmap, or why parsing/validation rejected the reply.
 *
 * The reason exists purely for logging in generateRoadmap — without it, a
 * rejected response vanished with no trace, making it impossible to tell a
 * transient API failure from a validation gate that's rejecting good
 * responses too often.
 */
export type ParseResult =
  | { roadmap: GeneratedRoadmap; reason: null }
  | { roadmap: null; reason: string };

export function parseGeneratedRoadmap(
  reply: string,
  input: RoadmapPromptInput,
): ParseResult {
  const json = extractJsonObject(reply);

  if (!json) {
    return { roadmap: null, reason: "no_json_object_found_in_reply" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return { roadmap: null, reason: "json_parse_error" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { roadmap: null, reason: "parsed_value_not_an_object" };
  }

  const candidate = parsed as Record<string, unknown>;

  const rawStepCount = Array.isArray(candidate.steps)
    ? candidate.steps.length
    : 0;

  const steps = Array.isArray(candidate.steps)
    ? candidate.steps
        .map(parseStep)
        .filter((step): step is GeneratedStep => step !== null)
        .slice(0, MAX_STEPS)
    : [];

  if (steps.length < MIN_STEPS) {
    return {
      roadmap: null,
      reason: `too_few_valid_steps (${steps.length} valid of ${rawStepCount} returned)`,
    };
  }

  const summary = isNonEmptyString(candidate.summary)
    ? candidate.summary.trim()
    : "";

  if (!summary) {
    return { roadmap: null, reason: "missing_summary" };
  }

  if (!mentionsBothRoles(summary, input.currentRole, input.targetRole)) {
    return { roadmap: null, reason: "summary_does_not_mention_both_roles" };
  }

  return {
    roadmap: {
      summary,
      transferableSkills: toStringArray(candidate.transferableSkills),

      // Optional and AI-asserted rather than database-verified — absent or
      // malformed means "none noted", never a parse failure.
      regulatoryConsiderations: toStringArray(candidate.regulatoryConsiderations),

      // Display-only suggestions — never a parse failure if absent/malformed.
      alternativeCareers: parseAlternativeCareers(
        candidate.alternativeCareers,
        input.targetRole,
      ),

      estimatedJourney: isNonEmptyString(candidate.estimatedJourney)
        ? candidate.estimatedJourney.trim()
        : null,

      steps,
    },
    reason: null,
  };
}

/**
 * Generates roadmap steps for one transition.
 *
 * Retries once, because the only thing enforcing JSON is the prompt. Returns
 * null when both attempts fail, and the caller falls back to the deterministic
 * roadmap rather than showing anything invented.
 *
 * Every failure is logged with which of the two distinct causes it was —
 * the edge function/network failing outright, versus a response that came
 * back but didn't pass validation — since those need different fixes and
 * previously left no trace to tell them apart.
 */
export async function generateRoadmap(
  input: RoadmapPromptInput,
): Promise<GeneratedRoadmap | null> {
  const prompt = buildRoadmapPrompt(input);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { text, error } = await askAIRaw(prompt);

    if (error || !text) {
      console.warn(
        `[roadmapGeneration] attempt ${attempt}/2 transport failure:`,
        error ?? "empty response",
      );
      continue;
    }

    const result = parseGeneratedRoadmap(text, input);

    if (result.roadmap) {
      return result.roadmap;
    }

    console.warn(
      `[roadmapGeneration] attempt ${attempt}/2 validation rejected:`,
      result.reason,
    );
  }

  return null;
}

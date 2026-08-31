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

export interface GeneratedRoadmap {
  summary: string;
  transferableSkills: string[];
  regulatoryConsiderations: string[];

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
 */
function extractJsonObject(text: string): string | null {
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isNonEmptyString(value: unknown): value is string {
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
 * Rejects a roadmap whose summary could belong to anybody — the summary must
 * name both roles, per the prompt.
 */
function mentionsBothRoles(
  summary: string,
  currentRole: string,
  targetRole: string,
): boolean {
  const haystack = summary.toLowerCase();

  return (
    haystack.includes(currentRole.trim().toLowerCase()) &&
    haystack.includes(targetRole.trim().toLowerCase())
  );
}

export function parseGeneratedRoadmap(
  reply: string,
  input: RoadmapPromptInput,
): GeneratedRoadmap | null {
  const json = extractJsonObject(reply);

  if (!json) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;

  const steps = Array.isArray(candidate.steps)
    ? candidate.steps
        .map(parseStep)
        .filter((step): step is GeneratedStep => step !== null)
        .slice(0, MAX_STEPS)
    : [];

  if (steps.length < MIN_STEPS) {
    return null;
  }

  const summary = isNonEmptyString(candidate.summary)
    ? candidate.summary.trim()
    : "";

  if (!summary || !mentionsBothRoles(summary, input.currentRole, input.targetRole)) {
    return null;
  }

  return {
    summary,
    transferableSkills: toStringArray(candidate.transferableSkills),

    // Optional and AI-asserted rather than database-verified — absent or
    // malformed means "none noted", never a parse failure.
    regulatoryConsiderations: toStringArray(candidate.regulatoryConsiderations),

    estimatedJourney: isNonEmptyString(candidate.estimatedJourney)
      ? candidate.estimatedJourney.trim()
      : null,

    steps,
  };
}

/**
 * Generates roadmap steps for one transition.
 *
 * Retries once, because the only thing enforcing JSON is the prompt. Returns
 * null when both attempts fail, and the caller falls back to the deterministic
 * roadmap rather than showing anything invented.
 */
export async function generateRoadmap(
  input: RoadmapPromptInput,
): Promise<GeneratedRoadmap | null> {
  const prompt = buildRoadmapPrompt(input);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { text, error } = await askAIRaw(prompt);

    if (error || !text) {
      continue;
    }

    const generated = parseGeneratedRoadmap(text, input);

    if (generated) {
      return generated;
    }
  }

  return null;
}

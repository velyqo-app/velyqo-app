import { askAIRaw } from "./aiProvider";
import {
  CapabilityPromptInput,
  buildCapabilityPrompt,
} from "./promptBuilderService";
import { extractJsonObject, isNonEmptyString } from "./roadmapGenerationService";
import { CapabilityImportance } from "../types/capability";

/**
 * One capability exactly as the model is asked to return it.
 *
 * This is a proposal only — VELYQO's own deterministic logic (a later step)
 * decides status, priority and evidence from it. Nothing here is persisted
 * or treated as ground truth about the user.
 */
export interface GeneratedCapability {
  name: string;
  description: string;
  importance: CapabilityImportance;

  /** Exactly one of the confirmed skills passed in, or null. A self-report
   * only — never sufficient on its own to call the capability a "strength". */
  matchesConfirmedSkill: string | null;
}

const MIN_CAPABILITIES = 6;
const MAX_CAPABILITIES = 10;

const VALID_IMPORTANCE: readonly CapabilityImportance[] = [
  "critical",
  "important",
  "helpful",
];

function isValidImportance(value: unknown): value is CapabilityImportance {
  return (
    typeof value === "string" &&
    (VALID_IMPORTANCE as readonly string[]).includes(value)
  );
}

/** Case/whitespace-insensitive comparison key for exact-duplicate names. */
function normaliseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function significantWords(name: string): Set<string> {
  const words = normaliseName(name).match(/[a-z]+/g) ?? [];

  return new Set(words.filter((word) => word.length >= 4));
}

/**
 * True when two capability names are close enough that both couldn't
 * reasonably appear in the same list — used to reject near-duplicates, not
 * just exact repeats.
 *
 * Deliberately simple, no external dependency: normalises case/whitespace
 * for an exact check, then (for a near-duplicate) checks whether every
 * significant word (>= 4 letters) of the shorter name also appears in the
 * longer one — e.g. "Stakeholder communication" is fully contained in
 * "Stakeholder communication skills". This only needs to catch obvious
 * repetition, not every possible paraphrase.
 */
function isNearDuplicate(a: string, b: string): boolean {
  if (normaliseName(a) === normaliseName(b)) {
    return true;
  }

  const wordsA = significantWords(a);
  const wordsB = significantWords(b);

  if (wordsA.size === 0 || wordsB.size === 0) {
    return false;
  }

  const [smaller, larger] =
    wordsA.size <= wordsB.size ? [wordsA, wordsB] : [wordsB, wordsA];

  const contained = Array.from(smaller).every((word) => larger.has(word));

  return contained;
}

/**
 * Validates one capability. "matchesConfirmedSkill" has exactly two valid
 * states — null/omitted, or an exact match to something the user actually
 * confirmed — and anything else drops the whole capability rather than
 * being repaired to null.
 *
 * This is deliberately stricter than name/description/importance's
 * "malformed field -> drop the item" handling would suggest by itself:
 * matchesConfirmedSkill later feeds deterministic status logic downstream,
 * which must be able to trust that a stored `null` means "the model
 * genuinely didn't claim a match" and never "the model hallucinated an
 * unsupported skill reference and we quietly guessed null instead". Only
 * the AI/application boundary can make that distinction — once repaired,
 * it's lost.
 */
function parseCapability(
  raw: unknown,
  confirmedSkills: string[],
): GeneratedCapability | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  if (
    !isNonEmptyString(candidate.name) ||
    !isNonEmptyString(candidate.description) ||
    !isValidImportance(candidate.importance)
  ) {
    return null;
  }

  const rawMatch = candidate.matchesConfirmedSkill;

  let matchesConfirmedSkill: string | null;

  if (rawMatch === null || rawMatch === undefined) {
    matchesConfirmedSkill = null;
  } else if (typeof rawMatch === "string" && confirmedSkills.includes(rawMatch)) {
    matchesConfirmedSkill = rawMatch;
  } else {
    // A non-null value that isn't an exact confirmed-skill match is a
    // hallucinated/unsupported reference — the whole capability is invalid,
    // not silently repaired.
    return null;
  }

  return {
    name: candidate.name.trim(),
    description: candidate.description.trim(),
    importance: candidate.importance,
    matchesConfirmedSkill,
  };
}

/**
 * Either the parsed capability list, or why parsing/validation rejected the
 * reply — the reason exists purely for logging in generateCapabilities, the
 * same way ParseResult works in roadmapGenerationService.
 */
export type CapabilityParseResult =
  | { capabilities: GeneratedCapability[]; reason: null }
  | { capabilities: null; reason: string };

export function parseGeneratedCapabilities(
  reply: string,
  confirmedSkills: string[],
): CapabilityParseResult {
  const json = extractJsonObject(reply);

  if (!json) {
    return { capabilities: null, reason: "no_json_object_found_in_reply" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return { capabilities: null, reason: "json_parse_error" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { capabilities: null, reason: "parsed_value_not_an_object" };
  }

  const candidate = parsed as Record<string, unknown>;

  if (!Array.isArray(candidate.capabilities)) {
    return { capabilities: null, reason: "missing_capabilities_array" };
  }

  const rawCount = candidate.capabilities.length;
  const accepted: GeneratedCapability[] = [];

  for (const rawCapability of candidate.capabilities) {
    const capability = parseCapability(rawCapability, confirmedSkills);

    if (!capability) {
      continue;
    }

    const isDuplicate = accepted.some((existing) =>
      isNearDuplicate(existing.name, capability.name),
    );

    if (isDuplicate) {
      continue;
    }

    accepted.push(capability);
  }

  if (accepted.length < MIN_CAPABILITIES) {
    return {
      capabilities: null,
      reason: `too_few_valid_capabilities (${accepted.length} valid of ${rawCount} returned)`,
    };
  }

  // Unlike roadmapGenerationService's step count, the capability contract
  // is a strict 6-10 range, not just a floor — an oversized response is a
  // contract violation to retry, not excess good data to cap silently.
  if (accepted.length > MAX_CAPABILITIES) {
    return {
      capabilities: null,
      reason: `too_many_valid_capabilities (${accepted.length} valid of ${rawCount} returned)`,
    };
  }

  return { capabilities: accepted, reason: null };
}

/**
 * A concise correction appended to the prompt only on the retry attempt,
 * and only after a first reply that arrived but failed validation — never
 * after a transport failure, since there was no reply to correct.
 */
function buildRetryPrompt(basePrompt: string, reason: string): string {
  return `${basePrompt}

=========================
YOUR PREVIOUS REPLY WAS REJECTED
=========================

Your previous response could not be used: ${reason}. Return ONLY the JSON
object described above — between 6 and 10 distinct, valid capabilities, no
markdown, no commentary.`;
}

/**
 * Generates the target-role capability list for the Career Gap Engine.
 *
 * Retries once, exactly like generateRoadmap — the only thing enforcing
 * JSON is the prompt. Returns null when both attempts fail; this function
 * never fabricates a fallback list, and does not persist anything.
 */
export async function generateCapabilities(
  input: CapabilityPromptInput,
): Promise<GeneratedCapability[] | null> {
  const prompt = buildCapabilityPrompt(input);
  let validationFailureReason: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const promptToSend = validationFailureReason
      ? buildRetryPrompt(prompt, validationFailureReason)
      : prompt;

    const { text, error } = await askAIRaw(promptToSend);

    if (error || !text) {
      console.warn(
        `[capabilityGeneration] attempt ${attempt}/2 transport failure:`,
        error ?? "empty response",
      );
      continue;
    }

    const result = parseGeneratedCapabilities(text, input.skills);

    if (result.capabilities) {
      return result.capabilities;
    }

    console.warn(
      `[capabilityGeneration] attempt ${attempt}/2 validation rejected:`,
      result.reason,
    );
    validationFailureReason = result.reason;
  }

  return null;
}

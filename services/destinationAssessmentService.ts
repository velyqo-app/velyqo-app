import { askAIRaw } from "./aiProvider";
import {
  DestinationAssessmentInput,
  buildDestinationAssessmentPrompt,
} from "./promptBuilderService";
import {
  extractJsonObject,
  isNonEmptyString,
  toStringArray,
} from "./roadmapGenerationService";

export interface DestinationAssessment {
  candidateTitles: string[];

  explanation: string;
}

function parseAssessment(reply: string): DestinationAssessment | null {
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

  const explanation = isNonEmptyString(candidate.explanation)
    ? candidate.explanation.trim()
    : "";

  if (!explanation) {
    return null;
  }

  return {
    candidateTitles: toStringArray(candidate.candidateTitles).slice(0, 3),
    explanation,
  };
}

/**
 * One lightweight AI call assessing an already-confirmed salary conflict.
 *
 * Must only ever be called after destinationResolutionService.checkSalaryConflict
 * has confirmed a real conflict against a verified band — this function has
 * no way to determine that itself and never claims to.
 *
 * Best-effort: a failure or unparseable reply returns null rather than
 * throwing. The decision screen can still render with the verified band and
 * generic phrasing when this is null — it is never the thing blocking the
 * screen from appearing.
 */
export async function assessDestination(
  input: DestinationAssessmentInput,
): Promise<DestinationAssessment | null> {
  const prompt = buildDestinationAssessmentPrompt(input);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { text, error } = await askAIRaw(prompt);

    if (error || !text) {
      console.warn(
        `[destinationAssessment] attempt ${attempt}/2 transport failure:`,
        error ?? "empty response",
      );
      continue;
    }

    const result = parseAssessment(text);

    if (result) {
      return result;
    }

    console.warn(
      `[destinationAssessment] attempt ${attempt}/2 could not be parsed`,
    );
  }

  return null;
}

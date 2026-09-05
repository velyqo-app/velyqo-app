export interface CoachResponseSection {
  /** Empty for a leading preamble written before the model's first
   * recognised section label — rendered as plain text, no header. */
  label: string;
  body: string;
}

const SECTION_LABELS = [
  "RECOMMENDATION",
  "WHY IT MATTERS",
  "OPTIONS",
  "YOUR NEXT MOVE",
];

/**
 * Splits a Coach reply into labelled sections when the model followed the
 * structured format the prompt asks for. Returns null when no recognised
 * label appears anywhere, so the caller falls back to a plain bubble rather
 * than showing an oddly-truncated "structured" view for an ordinary reply.
 *
 * Never assumes every response is structured — the prompt itself asks the
 * model to use plain conversational text for a short question, and this
 * parser must not force those into a broken layout.
 */
export function parseCoachResponse(text: string): CoachResponseSection[] | null {
  const lines = text.split("\n");

  const sections: CoachResponseSection[] = [];
  let currentLabel = "";
  let buffer: string[] = [];
  let foundAny = false;

  const flush = () => {
    const body = buffer.join("\n").trim();

    if (body) {
      sections.push({ label: currentLabel, body });
    }

    buffer = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const matched = SECTION_LABELS.find(
      (label) => trimmed.toUpperCase() === label,
    );

    if (matched) {
      flush();
      currentLabel = matched;
      foundAny = true;
    } else {
      buffer.push(rawLine);
    }
  }

  flush();

  return foundAny ? sections : null;
}

import { AIContext } from "../types/ai";

/**
 * 3-4 tappable suggested questions, adapted to whatever roadmap/mission
 * context is actually available — never padded with irrelevant filler, and
 * never more than a small handful. Pure function so the set is easy to
 * reason about and doesn't depend on when/how often it's called.
 */
export function buildSuggestedQuestions(
  context: AIContext | null,
  arrivedFromMission: boolean,
): string[] {
  if (!context) {
    return [
      "What should I focus on first?",
      "What should I do this week?",
      "How do I get started?",
    ];
  }

  const { roadmap, mission, profile } = context;
  const target = profile.target_role?.trim() || "your target role";
  const hasRoadmap = Boolean(roadmap && roadmap.steps.length > 0);

  const questions: string[] = [];

  if (arrivedFromMission) {
    questions.push(`Why does "${mission.title}" matter?`);
  }

  if (hasRoadmap && roadmap) {
    questions.push(`How can I prepare for ${roadmap.steps[0].title}?`);
    questions.push(`Am I on track for ${target}?`);
    questions.push("What could slow my progress?");
  } else {
    questions.push("What should I focus on first?");
    questions.push(`What skills should I prioritise for ${target}?`);
  }

  questions.push("What should I do this week?");

  // De-duplicated defensively (arrivedFromMission + no-roadmap can't
  // currently collide, but this keeps the cap honest if that ever changes).
  return Array.from(new Set(questions)).slice(0, 4);
}

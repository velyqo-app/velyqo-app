import { AIContext } from "../types/ai";

const NOT_SET = "Not set";

export interface RoadmapPromptInput {
  currentRole: string;
  targetRole: string;
  country: string | null;
  currentSalary: number | null;
  targetSalary: number | null;
  purpose: string | null;

  /** Verified catalogue roles between the two, when the database has any. */
  knownLadder: string[];
}

/**
 * Builds the roadmap-generation prompt.
 *
 * Asks for strict JSON because the `ai-coach` function is a plain text
 * pass-through with no structured-output mode. The caller parses defensively
 * and falls back, so a malformed reply degrades rather than breaks.
 *
 * Salary is deliberately excluded from the requested shape: every figure in
 * the app must come from `occupation_salary_bands`, never from a model.
 */
export function buildRoadmapPrompt(input: RoadmapPromptInput): string {
  const {
    currentRole,
    targetRole,
    country,
    currentSalary,
    targetSalary,
    purpose,
    knownLadder,
  } = input;

  return `
You are Velyqo's career pathway planner.

Design a realistic career roadmap for one specific professional moving from
their current role to their target role.

=========================
THIS PERSON
=========================

Current role: ${currentRole}
Target role: ${targetRole}
Country: ${country || NOT_SET}
Current salary: ${currentSalary ?? NOT_SET}
Target salary: ${targetSalary ?? NOT_SET}
What they want from their career: ${purpose || NOT_SET}
${
  knownLadder.length > 0
    ? `Verified roles between these two: ${knownLadder.join(", ")}`
    : "We have no verified intermediate roles for this transition."
}

=========================
RULES
=========================

1. Return between 3 and 5 steps, earliest first. The final step must be
   reaching ${targetRole}.
2. This person is already working as a ${currentRole}. Treat them as an
   experienced professional. Never propose entry-level steps, internships, or
   "learn the basics" stages.
3. Every step's "rationale" must refer to their specific experience as a
   ${currentRole} and explain why that step follows from it.
4. "transferableSkills" must list skills they already have from being a
   ${currentRole} that carry directly into ${targetRole}.
5. "summary" must mention both "${currentRole}" and "${targetRole}" by name.
6. NEVER mention salary, pay, compensation, or any monetary figure anywhere in
   your response. Salary is handled elsewhere.
7. Be specific to this transition. Generic advice that would suit any career
   change is not acceptable.
8. "estimatedTime" must be a duration such as "3-6 months".
9. "title" must be the name of the stage only. Do NOT number it or prefix it —
   no "Step 1", "Step 1 -", "1.", or "Phase 2". Ordering is handled elsewhere.

=========================
OUTPUT FORMAT
=========================

Return ONLY a JSON object matching this shape. No markdown, no code fences, no
commentary before or after.

{
  "summary": "string",
  "transferableSkills": ["string"],
  "steps": [
    {
      "title": "string",
      "description": "string",
      "skills": ["string"],
      "actions": ["string"],
      "estimatedTime": "string",
      "rationale": "string"
    }
  ]
}
`;
}

export function buildCoachPrompt(context: AIContext, message: string): string {
  const { profile, mission, progress, momentum } = context;

  // `profile` is a raw database row, so every field here must be snake_case.
  // Reading camelCase keys off it previously sent literal "undefined" values
  // to the model, which is exactly what stops responses being personalised.
  return `
You are Velyqo, an AI Career Coach.

Your mission is to help professionals make one meaningful career improvement today.

Guidelines:
- Personalise every response using the user's profile.
- Explain why your advice matters.
- Be encouraging but realistic.
- Recommend one clear next step.
- Keep responses concise unless the user asks for more detail.
- If a detail below is "${NOT_SET}", ask for it rather than assuming a value.

=========================
USER PROFILE
=========================

Name: ${profile.full_name || "User"}
Current Role: ${profile.current_role || NOT_SET}
Target Role: ${profile.target_role || NOT_SET}

=========================
TODAY'S MISSION
=========================

Title:
${mission.title}

Description:
${mission.description}

Estimated Time:
${mission.estimatedTime}

Why It Matters:
${mission.impact}

=========================
CAREER PROGRESS
=========================

Career Readiness:
${progress.career_readiness}%

Momentum:
${momentum.level}

=========================
USER QUESTION
=========================

${message}

=========================
YOUR RESPONSE
=========================

Provide practical career coaching based on the information above.
`;
}

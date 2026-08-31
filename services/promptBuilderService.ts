import { AIContext } from "../types/ai";
import {
  EDUCATION_LEVEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  EducationLevel,
  ExperienceLevel,
  STARTING_SITUATION_LABELS,
  StartingSituation,
  TARGET_TIMEFRAME_LABELS,
  TargetTimeframe,
  impliesNoProfessionalExperience,
} from "../types/careerContext";

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

  /**
   * "" (not answered) is treated identically to a profile predating this
   * phase — the prompt falls back to the original Phase 2 framing, which is
   * what keeps previously-verified transitions unchanged.
   */
  startingSituation: StartingSituation | "";
  experienceLevel: ExperienceLevel | "";
  educationLevel: EducationLevel | "";
  skills: string[];
  targetTimeframe: TargetTimeframe | "";
}

/**
 * How the prompt should frame this person's seniority.
 *
 * "" (no answer on file) intentionally reuses the original Phase 2 wording —
 * the only branch that existed before this phase — so a profile with none of
 * the new fields produces the same instruction it always has.
 */
function experienceFraming(
  situation: StartingSituation | "",
  currentRole: string,
): string {
  if (situation === "student") {
    return `This person is a student, not a working professional. Do NOT claim or
imply they have held the role "${currentRole}" as a job — treat it as their
field of study or interest. Build the roadmap from foundational, entry-
appropriate steps. Do not assume any prior workplace experience.`;
  }

  if (situation === "no_experience") {
    return `This person has no professional experience yet. Do NOT claim or imply
they have worked as a "${currentRole}" — treat it only as the field or type of
work they are interested in. Build the roadmap from foundational, entry-
appropriate steps. Do not assume any prior workplace experience, achievements,
or responsibilities.`;
  }

  if (situation === "returning_to_work") {
    return `This person is returning to work after a gap. Treat their experience as
${currentRole} as real but not necessarily current — do not assume their
skills or knowledge are fully up to date, and consider a step that helps them
refresh or update before returning at full capacity.`;
  }

  if (situation === "early_career") {
    return `This person is early in their career as a ${currentRole}. Treat them as
having some real workplace experience, but do not assume the depth of
experience a senior professional would have.`;
  }

  // "experienced", "changing_careers", or not answered ("") — the original
  // Phase 2 framing.
  return `This person is already working as a ${currentRole}. Treat them as an
experienced professional. Never propose entry-level steps, internships, or
"learn the basics" stages.`;
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
    startingSituation,
    experienceLevel,
    educationLevel,
    skills,
    targetTimeframe,
  } = input;

  const noExperience = impliesNoProfessionalExperience(startingSituation);

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
Starting situation: ${
    startingSituation ? STARTING_SITUATION_LABELS[startingSituation] : NOT_SET
  }
Professional experience in their CURRENT field (${currentRole}), not the target
field: ${experienceLevel ? EXPERIENCE_LEVEL_LABELS[experienceLevel] : NOT_SET}
Education: ${
    educationLevel ? EDUCATION_LEVEL_LABELS[educationLevel] : NOT_SET
  }
Skills this person has confirmed they have: ${
    skills.length > 0 ? skills.join(", ") : "None confirmed yet"
  }
How quickly they want to get there: ${
    targetTimeframe ? TARGET_TIMEFRAME_LABELS[targetTimeframe] : NOT_SET
  }
${
  knownLadder.length > 0
    ? `Verified roles between these two: ${knownLadder.join(", ")}`
    : "We have no verified intermediate roles for this transition."
}

=========================
CRITICAL RULE — READ FIRST
=========================

Never claim or imply this person has experience, qualifications, skills,
achievements, responsibilities, or employment history unless it was explicitly
supplied above or is a skill they confirmed. You may identify a skill as
TRANSFERABLE from their situation, but you must label it as transferable, not
present it as proven experience. When in doubt, say less about what they
already have rather than assume more.

=========================
RULES
=========================

1. Return between 2 and 8 steps, earliest first, matching how far apart these
   two roles actually are — do not pad a short transition or compress a long
   one into a fixed number of steps. The final step must be reaching
   ${targetRole}.
2. ${experienceFraming(startingSituation, currentRole)}
3. Every step's "rationale" must refer to this specific person's real
   situation above (their stated experience, skills, or education — never
   invented experience) and explain why that step follows from it.
4. "transferableSkills" must list skills they plausibly already have that
   carry into ${targetRole}, based only on what was stated above. ${
     noExperience
       ? `This person has no professional experience, so only list general
   capabilities (e.g. communication, organisation) — never a workplace skill
   implied by "${currentRole}".`
       : `Ground these in their stated current role and confirmed skills.`
   }
5. "summary" must mention both "${currentRole}" and "${targetRole}" by name.
6. NEVER mention salary, pay, compensation, or any monetary figure anywhere in
   your response. Salary is handled elsewhere.
7. Be specific to this transition. Generic advice that would suit any career
   change is not acceptable.
8. "estimatedTime" must be a duration such as "3-6 months".
9. "title" must be the name of the stage only. Do NOT number it or prefix it —
   no "Step 1", "Step 1 -", "1.", or "Phase 2". Ordering is handled elsewhere.
10. Before writing the steps, reason through: what this person already has,
    which of it is genuinely transferable, their skill gaps, their experience
    gaps, any qualifications or requirements the target role needs, the
    evidence they will need to build, and only then the appropriate
    intermediate roles. Let that reasoning shape the steps you return — do not
    include the reasoning itself in the output.
11. If ${targetRole} normally requires a formal qualification, licence,
    registration, or other regulated requirement to practise, list each one in
    "regulatoryConsiderations" as a short factual statement (e.g. "Registered
    nurses in the UK must be registered with the NMC"). This is your own
    knowledge, not verified data, so state it plainly without exaggerating
    certainty. If there is no such requirement, return an empty array.
12. "estimatedJourney" must be your own estimate of the TOTAL time from today
    to reaching ${targetRole}, as a duration such as "18-30 months". Do NOT
    simply add up every step's "estimatedTime" — some steps realistically
    overlap (for example, networking or building a portfolio can happen
    alongside a previous step rather than strictly after it finishes).
    Reason about which steps can genuinely run in parallel and let your total
    reflect that, so it is normally shorter than a straight sum of every
    step's own estimate. It must never be longer than that straight sum.
13. Reread the CRITICAL RULE above before finalising your response.

=========================
OUTPUT FORMAT
=========================

Return ONLY a JSON object matching this shape. No markdown, no code fences, no
commentary before or after.

{
  "summary": "string",
  "transferableSkills": ["string"],
  "regulatoryConsiderations": ["string"],
  "estimatedJourney": "string",
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

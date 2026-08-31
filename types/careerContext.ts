/**
 * The user's starting situation, captured early in onboarding because it
 * conditions how later screens (experience level, current role framing,
 * skill suggestions, and the roadmap prompt) behave.
 *
 * "" means not yet answered — every consumer must treat it the same as null,
 * never as a sixth situation.
 */
export type StartingSituation =
  | "student"
  | "early_career"
  | "experienced"
  | "changing_careers"
  | "returning_to_work"
  | "no_experience";

export type ExperienceLevel =
  | "none"
  | "under_1"
  | "1_to_3"
  | "3_to_5"
  | "5_to_10"
  | "10_plus";

export type EducationLevel =
  | "gcse"
  | "a_level"
  | "apprenticeship"
  | "undergraduate"
  | "masters"
  | "doctorate"
  | "professional_qualification"
  | "other"
  | "prefer_not_to_say";

export type TargetTimeframe =
  | "as_fast_as_possible"
  | "1_to_2_years"
  | "3_to_5_years"
  | "5_to_10_years"
  | "flexible";

export const STARTING_SITUATION_LABELS: Record<StartingSituation, string> = {
  student: "Student",
  early_career: "Early-career professional",
  experienced: "Experienced professional",
  changing_careers: "Changing careers",
  returning_to_work: "Returning to work",
  no_experience: "No professional experience",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  none: "No experience",
  under_1: "Less than 1 year",
  "1_to_3": "1–3 years",
  "3_to_5": "3–5 years",
  "5_to_10": "5–10 years",
  "10_plus": "10+ years",
};

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  gcse: "GCSE / equivalent",
  a_level: "A-level / equivalent",
  apprenticeship: "Apprenticeship / vocational qualification",
  undergraduate: "Undergraduate degree",
  masters: "Master's degree",
  doctorate: "Doctorate",
  professional_qualification: "Professional qualification",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

export const TARGET_TIMEFRAME_LABELS: Record<TargetTimeframe, string> = {
  as_fast_as_possible: "As quickly as realistically possible",
  "1_to_2_years": "1–2 years",
  "3_to_5_years": "3–5 years",
  "5_to_10_years": "5–10 years",
  flexible: "I'm flexible",
};

/** Situations where experience-level and current-role questions must not
 * imply the user has held a job. */
export function impliesNoProfessionalExperience(
  situation: StartingSituation | "",
): boolean {
  return situation === "student" || situation === "no_experience";
}

/**
 * What the user chose when a confirmed salary conflict was shown to them.
 *
 * "role" means the requested target role is kept unchanged — the roadmap
 * still targets exactly what the user asked for. Only "salary"/"balance"
 * ever resolve to a different destination, and "both" generates both
 * destinations rather than picking one.
 */
export type SalaryPriority = "role" | "salary" | "balance" | "both";

export const SALARY_PRIORITY_LABELS: Record<SalaryPriority, string> = {
  role: "Reach my requested role sooner",
  salary: "Prioritise my salary target",
  balance: "Balance salary and time",
  both: "Show me both pathways",
};

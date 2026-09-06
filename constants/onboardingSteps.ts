/**
 * Single source of truth for onboarding's step numbering, so every screen's
 * OnboardingProgress agrees with every other one. Mirrors the flow's actual
 * navigation order (name -> purpose -> starting-situation -> current-role ->
 * experience-level -> target-role -> education -> skills -> country ->
 * current-salary -> target-salary -> target-timeframe -> summary).
 *
 * experience-level is skipped for a student/no-experience path
 * (impliesNoProfessionalExperience) — its number is simply not shown to
 * that user rather than the remaining steps being renumbered, since the
 * total step count stays fixed either way.
 */
export const ONBOARDING_TOTAL_STEPS = 13;

export const ONBOARDING_STEP = {
  name: 1,
  purpose: 2,
  startingSituation: 3,
  currentRole: 4,
  experienceLevel: 5,
  targetRole: 6,
  education: 7,
  skills: 8,
  country: 9,
  currentSalary: 10,
  targetSalary: 11,
  targetTimeframe: 12,
  summary: 13,
} as const;

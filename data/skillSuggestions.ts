/**
 * Small, hand-maintained skill suggestion seeds — not a skills catalogue.
 *
 * The database has no skills table and `occupations.category` is the only
 * reusable signal it offers (today that's a single value, "Engineering", since
 * the catalogue has 4 rows). Buckets here are suggestions to select or
 * dismiss, never a claim that the user has them — see skillSuggestionService.
 */
export const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  Engineering: [
    "Technical problem solving",
    "CAD / design software",
    "Root cause analysis",
    "Project planning",
    "Cross-functional collaboration",
    "Data-driven decision making",
    "Process improvement",
    "Technical documentation",
  ],
};

/** Used for any current role that doesn't resolve to a known category. */
export const GENERAL_FALLBACK_SKILLS: string[] = [
  "Communication",
  "Teamwork",
  "Organisation",
  "Problem solving",
  "Time management",
  "Adapting to change",
  "Customer service",
  "Attention to detail",
];

/**
 * For "student" and "no professional experience" starting situations.
 *
 * Framed entirely as capabilities a person can plausibly have without ever
 * having held a job — nothing here implies workplace experience.
 */
export const NO_EXPERIENCE_SKILLS: string[] = [
  "Communication",
  "Teamwork",
  "Organisation",
  "Digital skills",
  "Problem solving",
  "Willingness to learn",
  "Time management",
  "Working under guidance",
];

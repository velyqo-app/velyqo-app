/**
 * Indicative GBP market estimates for three seeded roles.
 *
 * These are not per-user figures and there is no equivalent data for any other
 * country or occupation. Read them through `getIndicativeSalary` rather than
 * directly, so a GBP number is never shown to someone who selected a different
 * country. Phase 2 replaces this with `occupation_salary_bands`, which carries
 * a real country code, currency, confidence and source.
 */
export const salaryData = {
  "cybersecurity analyst": {
    average: 52500,
    min: 35000,
    max: 70000,
    nextRoles: [
      "Senior Cybersecurity Analyst",
      "Security Architect",
      "Cybersecurity Manager",
    ],
  },

  "project manager": {
    average: 62500,
    min: 45000,
    max: 80000,
    nextRoles: [
      "Senior Project Manager",
      "Programme Manager",
      "Portfolio Manager",
    ],
  },

  "software engineer": {
    average: 65000,
    min: 40000,
    max: 90000,
    nextRoles: [
      "Senior Software Engineer",
      "Lead Engineer",
      "Engineering Manager",
    ],
  },
};

export type IndicativeSalary = (typeof salaryData)[keyof typeof salaryData];

/**
 * Returns indicative salary data only when we actually have some.
 *
 * Null means "no reliable data" and callers must render an unavailable state
 * rather than substituting a zero or an unrelated role's figure.
 */
export function getIndicativeSalary(
  targetRole: string,
  country: string,
): IndicativeSalary | null {
  // The seeded figures are GBP, so they are meaningless for other countries.
  if (country !== "United Kingdom") {
    return null;
  }

  const key = targetRole.trim().toLowerCase() as keyof typeof salaryData;

  return salaryData[key] ?? null;
}

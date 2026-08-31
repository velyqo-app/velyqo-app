import {
  GENERAL_FALLBACK_SKILLS,
  NO_EXPERIENCE_SKILLS,
  SKILLS_BY_CATEGORY,
} from "../data/skillSuggestions";
import { StartingSituation, impliesNoProfessionalExperience } from "../types/careerContext";

/**
 * Suggested skills for the skills-selection screen.
 *
 * `startingSituation` is checked first and, when it implies no professional
 * experience, overrides category entirely — a student who types an
 * occupation-sounding phrase into "what are you studying" must never be shown
 * the professional skills bucket for it.
 */
export function getSuggestedSkills(
  category: string | null,
  startingSituation: StartingSituation | "",
): string[] {
  if (impliesNoProfessionalExperience(startingSituation)) {
    return NO_EXPERIENCE_SKILLS;
  }

  if (category && SKILLS_BY_CATEGORY[category]) {
    return SKILLS_BY_CATEGORY[category];
  }

  return GENERAL_FALLBACK_SKILLS;
}

/** Every seed skill, deduplicated, for the search/add list. */
export function getAllKnownSkills(): string[] {
  const all = new Set<string>([
    ...GENERAL_FALLBACK_SKILLS,
    ...NO_EXPERIENCE_SKILLS,
    ...Object.values(SKILLS_BY_CATEGORY).flat(),
  ]);

  return Array.from(all).sort((a, b) => a.localeCompare(b));
}

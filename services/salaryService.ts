import { supabase } from "../lib/supabase";

export interface SalaryBand {
  id: string;

  occupation_id: string;

  occupation_experience_level_id: string | null;

  scope: "OCCUPATION" | "EXPERIENCE_LEVEL";

  country_code: string;

  currency: string;

  low_salary: number;

  median_salary: number;

  high_salary: number;

  confidence: number;

  source: string | null;

  source_url: string | null;

  source_sample_size: number | null;

  data_type: "OBSERVED" | "AGGREGATED" | "ESTIMATED";

  last_updated: string | null;

  /**
   * Shape of the embedded join, not a flat `experience_level` field.
   *
   * Both hops are many-to-one (`occupation_experience_level_id` and
   * `experience_level_id`), so PostgREST nests an object at each level rather
   * than an array. Read it through `getBandExperienceLevel` instead of
   * reaching into it directly.
   */
  occupation_experience_levels?: {
    experience_levels: ExperienceLevel | null;
  } | null;
}

export interface ExperienceLevel {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

/** Flattens the embedded join, which is absent on occupation-wide bands. */
export const getBandExperienceLevel = (
  band: SalaryBand,
): ExperienceLevel | null => {
  return band.occupation_experience_levels?.experience_levels ?? null;
};

export const getSalaryBands = async (
  occupationId: string,
  countryCode: string,
) => {
  return await supabase
    .from("occupation_salary_bands")
    .select(
      `
        *,
        occupation_experience_levels (
          experience_levels (
            id,
            code,
            name,
            sort_order
          )
        )
      `,
    )
    .eq("occupation_id", occupationId)
    .eq("country_code", countryCode)
    .order("scope", { ascending: true })
    .returns<SalaryBand[]>();
};
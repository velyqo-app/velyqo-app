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

  experience_level?: {
    id: string;
    code: string;
    name: string;
    sort_order: number;
  } | null;
}

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
    .order("scope", { ascending: true });
};
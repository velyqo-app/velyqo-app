import { supabase } from "../lib/supabase";
import { Occupation } from "../types/occupation";

export async function searchOccupations(
  searchText: string
): Promise<Occupation[]> {
  const query = searchText.trim();

  if (!query) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_occupations", {
    search_text: query,
  });

  if (error) {
    console.error("Occupation search failed:", error);
    throw error;
  }

  return (data ?? []) as Occupation[];
}
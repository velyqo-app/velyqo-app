import { supabase } from "../lib/supabase";
import { CatalogueOccupation, Occupation } from "../types/occupation";

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

  // One row comes back per matching alias, so the same occupation can repeat.
  // Keeping the first occurrence preserves the RPC's title-before-alias order.
  const rows = (data ?? []) as Occupation[];

  return Array.from(
    new Map(rows.map((row) => [row.id, row])).values(),
  );
}

/**
 * Finds the single catalogue occupation whose title matches exactly.
 *
 * Used to recover an occupation id from a stored free-text title, because
 * `profiles` has no occupation id column. Returns null when there is no match
 * or more than one, so an ambiguous title is never silently resolved to the
 * wrong role.
 */
export async function resolveOccupationByTitle(
  title: string,
): Promise<Occupation | null> {
  const query = title.trim();

  if (!query) {
    return null;
  }

  let matches: Occupation[];

  try {
    matches = await searchOccupations(query);
  } catch {
    // Resolution is best-effort; the caller degrades to a free-text roadmap.
    return null;
  }

  // search_occupations emits one row per matching alias, so the same
  // occupation can come back several times.
  const unique = new Map<string, Occupation>();

  matches
    .filter((match) => match.title.trim().toLowerCase() === query.toLowerCase())
    .forEach((match) => unique.set(match.id, match));

  if (unique.size !== 1) {
    return null;
  }

  return Array.from(unique.values())[0];
}

export async function getOccupationById(
  occupationId: string,
): Promise<CatalogueOccupation | null> {
  const { data, error } = await supabase
    .from("occupations")
    .select("id, title, category, level")
    .eq("id", occupationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CatalogueOccupation;
}

/**
 * All active occupations in a category, used to derive a progression ladder.
 */
export async function getOccupationsByCategory(
  category: string,
): Promise<CatalogueOccupation[]> {
  const { data, error } = await supabase
    .from("occupations")
    .select("id, title, category, level")
    .eq("category", category)
    .eq("is_active", true);

  if (error || !data) {
    return [];
  }

  return data as CatalogueOccupation[];
}
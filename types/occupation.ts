export interface Occupation {
    id: string;
    title: string;
    category: string;
    level: string | null;
    matched_on: "title" | "alias";
}

/**
 * A row read straight from the `occupations` table.
 *
 * Same shape as `Occupation` minus `matched_on`, which only exists on results
 * from the `search_occupations` RPC.
 */
export interface CatalogueOccupation {
    id: string;
    title: string;
    category: string;
    level: string | null;
}
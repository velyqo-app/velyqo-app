export interface Occupation {
    id: string;
    title: string;
    category: string;
    level: string | null;
    matched_on: "title" | "alias";
}
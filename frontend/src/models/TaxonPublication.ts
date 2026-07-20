export interface TaxonPublication {
    id: number;
    abbrev: string;
    title: string | null;
    authors: string | null;
    publisher: string | null;
    year: number | null;
}
export interface Taxon {
    id: number;
    nameLat: string;
    nameHtml: string;
    nameCz?: string | null;
    rank: number | null;
    author?: string | null;
    hybridParents?: string | null;
    suppressed: boolean | null;
    note?: string | null;
    parentId: number | null;
}
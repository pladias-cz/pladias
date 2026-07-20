export interface BibliographyDto {
    id: number;
    originalSourceKey?: string | null;
    authors?: string | null;
    year?: number | null;
    title?: string | null;
    etc?: string | null;
    remarks?: string | null;
    originalId?: number | null;
    excerpted: boolean;
    journal?: string | null;
    journalId?: string | null;
    recordsCount?: number | null;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
}
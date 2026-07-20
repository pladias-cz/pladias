/**
 * Record history entry DTO
 * Matches backend RecordHistoryDto
 */
export interface RecordHistoryEntry {
    id: number;
    recordId: number;
    userId: number | null;
    userName: string | null;
    changeType: 'LOCATION' | 'DESCRIPTION' | 'FLAG' | 'COMMENT' | 'TAXON' | null;
    fieldDesc: string | null;
    oldValue: string | null;
    newValue: string | null;
    createTimestamp: string | null;
    commentId: number | null;
}

/**
 * Paginated response for record history
 * Matches ServerSideDataResponse format from DataTable
 */
export interface RecordHistoryResponse {
    success: boolean;
    data: RecordHistoryEntry[];
    totalCount: number;
    filteredCount?: number;
    error?: string;
}
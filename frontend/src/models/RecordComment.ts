/**
 * Record comment DTO
 * Matches backend RecordCommentDto
 */
export interface RecordComment {
    id: number;
    authorId: number | null;
    authorName: string | null;
    message: string | null;
    createTimestamp: string | null;
    resolved: boolean | null;
    resolvedById: number | null;
    resolvedByName: string | null;
    resolvedTimestamp: string | null;
    deleted: boolean | null;
}

/**
 * Response for record comments endpoint
 */
export interface RecordCommentsResponse {
    success: boolean;
    data: RecordComment[];
    error?: string;
}
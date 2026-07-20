import type { RecordFullResponse, RecordPladiasFull } from '@/models/RecordPladiasFull';
import type { RecordHistoryEntry, RecordHistoryResponse } from '@/models/RecordHistory';
import type { RecordComment, RecordCommentsResponse } from '@/models/RecordComment';

/**
 * Fetch a complete record with all relationship data
 * @param recordId - The record ID to fetch
 * @returns Promise with the full record data
 */
export async function fetchRecordFull(recordId: number): Promise<RecordPladiasFull> {
    const response = await fetch(`/api/react/atlas/record/${recordId}/full`);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Record not found');
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch record: ${response.statusText}`);
    }
    
    const result: RecordFullResponse = await response.json();
    
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch record');
    }
    
    // Convert lastEditTimestamp ISO string to milliseconds timestamp for conflict detection
    if (result.data.lastEditTimestamp) {
        result.data.lastEditTimestampNum = Date.parse(result.data.lastEditTimestamp);
    }
    
    return result.data;
}

/**
 * Fetch paginated record history with optional filtering and sorting
 * @param recordId - The record ID to get history for
 * @param page - Page number (default: 1)
 * @param pageSize - Items per page (default: 20)
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction ('asc' or 'desc')
 * @param filter - Optional filter text
 * @param changeType - Optional filter by change type
 * @returns Promise with paginated history entries
 */
export async function fetchRecordHistory(
    recordId: number,
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'createTimestamp',
    sortOrder: 'asc' | 'desc' = 'desc',
    filter?: string,
    changeType?: string
): Promise<RecordHistoryEntry[]> {
    const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
    });
    
    if (filter && filter.trim()) {
        params.append('filter', filter.trim());
    }
    
    if (changeType && changeType.trim()) {
        params.append('changeType', changeType);
    }
    
    const response = await fetch(`/api/react/atlas/record/history/${recordId}?${params.toString()}`);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Record not found');
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch record history: ${response.statusText}`);
    }
    
    const result: RecordHistoryResponse = await response.json();
    
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch record history');
    }
    
    return result.data;
}

/**
 * Fetch comments for a record
 * @param recordId - The record ID to get comments for
 * @returns Promise with array of comments
 */
export async function fetchRecordComments(recordId: number): Promise<RecordComment[]> {
    const response = await fetch(`/api/react/atlas/record/comments/${recordId}`);
    
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('Record not found');
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication required');
        }
        throw new Error(`Failed to fetch record comments: ${response.statusText}`);
    }
    
    const result: RecordCommentsResponse = await response.json();
    
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch record comments');
    }
    
    return result.data;
}

/**
 * Create a new comment on a record
 * @param recordId - The record ID to add comment to
 * @param message - The comment message
 * @returns Promise with the created comment data
 */
export async function createComment(recordId: number, message: string): Promise<void> {
    const response = await fetch('/api/react/atlas/record/comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordId, message }),
    });

    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to create comment: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to create comment');
    }
}

/**
 * Resolve a comment
 * @param commentId - The comment ID to resolve
 * @returns Promise with the resolved comment data
 */
export async function resolveComment(commentId: number): Promise<void> {
    const response = await fetch(`/api/react/atlas/record/comment/${commentId}/resolve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to resolve comment: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to resolve comment');
    }
}

/**
 * Delete (soft delete) a comment
 * @param commentId - The comment ID to delete
 * @returns Promise
 */
export async function deleteComment(commentId: number): Promise<void> {
    const response = await fetch(`/api/react/atlas/record/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to delete comment: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Failed to delete comment');
    }
}


/**
 * Update a record field
 * @param recordId - The record ID to update
 * @param field - The field name to update
 * @param value - The new value
 * @param lastEditTimestamp - Optional timestamp for conflict detection
 * @returns Promise with the updated record data
 */
export async function updateRecordField(
    recordId: number,
    field: string,
    value: any,
    lastEditTimestamp?: number
): Promise<RecordPladiasFull> {
    const formData = new URLSearchParams();
    formData.append('recordId', recordId.toString());
    formData.append('field', field);
    formData.append('value', value?.toString() || '');
    
    if (lastEditTimestamp !== undefined) {
        formData.append('lastEditTimestamp', lastEditTimestamp.toString());
    }
    
    const response = await fetch('/api/react/atlas/record/updateField', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });
    
    if (!response.ok) {
        throw new Error(`Failed to update record: ${response.statusText}`);
    }
    
    const result: RecordFullResponse = await response.json();
    
    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update record');
    }
    
    // Convert lastEditTimestamp ISO string to milliseconds timestamp for conflict detection
    if (result.data.lastEditTimestamp) {
        result.data.lastEditTimestampNum = Date.parse(result.data.lastEditTimestamp);
    }
    
    return result.data;
}

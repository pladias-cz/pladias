/**
 * Hook to check user permissions for record editing
 */

import type { RecordPladias, RecordPladiasFull } from '@/models';

export function useRecordPermissions(record: RecordPladias | RecordPladiasFull | null) {
    const canEdit = record?.canEdit ?? false;
    
    const canEditComments = !!record;
    
    const canEditComment = (commentAuthorId?: number): boolean => {
        return commentAuthorId !== undefined;
    };
    
    return {
        canEdit,
        canEditComments,
        canEditComment,
    };
}

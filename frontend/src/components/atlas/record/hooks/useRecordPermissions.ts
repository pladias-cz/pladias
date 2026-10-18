/**
 * Hook to check user permissions for record editing
 */

import type { RecordPladias, RecordPladiasFull } from '@/models';

export function useRecordPermissions(record: RecordPladias | RecordPladiasFull | null) {
    const canEdit = record?.canEdit ?? false;

    return {
        canEdit,
    };
}

/**
 * Hook to check user permissions for record editing.
 * Flags are computed by the backend (RecordEditPermissions) and derive 1:1 from endpoint checks:
 * - canEditCommonFields – common record fields (also ancestor taxon supervisors, project managers, batch authors)
 * - canEditValidationFields – validation (semaphore) fields: mapAdmin, bulkEditor, direct taxon supervisor
 * - canEditOriginalId – external (original) ID: instances' atlas.externalIdEditableProjectIds list, or mapAdmin (always)
 * - canResolveComments – comment resolution (Record.isUserElligibleToEditEverything)
 * - isLocked – record is locked (backend refuses edits with 403)
 */

import type {RecordPladias, RecordPladiasFull} from '@/models';

export function useRecordPermissions(record: RecordPladias | RecordPladiasFull | null) {
    const canEditCommonFields = record?.canEditCommonFields ?? false;
    const canEditValidationFields = record?.canEditValidationFields ?? false;
    const canEditOriginalId = record?.canEditOriginalId ?? false;
    const canResolveComments = record?.canResolveComments ?? false;
    const isLocked = record?.locked ?? false;

    return {
        canEditCommonFields,
        canEditValidationFields,
        canEditOriginalId,
        canResolveComments,
        isLocked,
    };
}

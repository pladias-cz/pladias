/**
 * Optimistická lokální kopie záznamu pro inline editace (improvements 2.4).
 *
 * Drží lokální (optimistické) editace polí záznamu; synchronizuje se s prop `record`
 * jen při změně id (úplný sync) nebo při externí změně lastEditTimestampNum (sync
 * jen timestampu). Všechny komponenty tak stále vidí poslední timestamp pro detekci
 * koliz, ale neuložené lokální editace se nepřepíší.
 */
import {useEffect, useState} from 'react';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';

export function useOptimisticRecord(record: RecordPladiasFull) {
    const [localRecord, setLocalRecord] = useState<RecordPladiasFull>(record);

    // Sync localRecord with record prop when ID changes OR when timestamp changes from external source
    // This ensures all components see the latest timestamp for conflict detection
    // But we preserve optimistic updates by only syncing fields that came from backend
    useEffect(() => {
        if (record.id !== localRecord.id) {
            // Record changed completely - full sync
            setLocalRecord(record);
        } else if (record.lastEditTimestampNum !== localRecord.lastEditTimestampNum) {
            // Timestamp changed externally (from another component) - sync timestamp only
            setLocalRecord((prev) => ({
                ...prev,
                lastEditTimestampNum: record.lastEditTimestampNum
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- záměrná částečná synchronizace: full-sync jen při změně id, jinak jen timestamp (optimistické lokální editace se nesmí přepsat)
    }, [record.id, record.lastEditTimestampNum]);

    return {localRecord, setLocalRecord};
}

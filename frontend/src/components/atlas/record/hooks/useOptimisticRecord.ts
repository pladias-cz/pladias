/**
 * Optimistická lokální kopie záznamu pro inline editace (improvements 2.4).
 *
 * Drží lokální (optimistické) editace polí záznamu; synchronizuje se s prop `record`
 * jen při změně id (úplný sync) nebo při externí změně lastEditTimestampNum (sync
 * jen timestampu). Všechny komponenty tak stále vidí poslední timestamp pro detekci
 * koliz, ale neuložené lokální editace se nepřepíší.
 */
import {useState} from 'react';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';

export function useOptimisticRecord(record: RecordPladiasFull) {
    const [localRecord, setLocalRecord] = useState<RecordPladiasFull>(record);

    // Sync localRecord with record prop when ID changes OR when timestamp changes from external
    // source. Render-phase updates guarded by comparison (React docs: adjusting state when a prop
    // changes) – all components see the latest timestamp for conflict detection, but optimistic
    // local edits are preserved: full sync only when the id changes, otherwise timestamp only.
    if (record.id !== localRecord.id) {
        setLocalRecord(record);
    } else if (record.lastEditTimestampNum !== localRecord.lastEditTimestampNum) {
        setLocalRecord((prev) => ({
            ...prev,
            lastEditTimestampNum: record.lastEditTimestampNum
        }));
    }

    return {localRecord, setLocalRecord};
}

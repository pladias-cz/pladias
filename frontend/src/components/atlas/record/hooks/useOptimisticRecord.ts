/**
 * Optimistická lokální kopie záznamu pro inline editace (improvements 2.4).
 *
 * Drží lokální (optimistické) editace polí záznamu; synchronizuje se s prop `record`
 * jen při změně id (úplný sync) nebo při externí změně lastEditTimestampNum (sync
 * viz níže). Všechny komponenty tak stále vidí poslední timestamp pro detekci koliz.
 *
 * ⚠️ Vnější změnu pole, které se na stránce nedá editovat (např. `comment` po přenesení
 * komentáře do poznámky – `POST /atlas/record/comment/:id/move-to-record-comment`), proto
 * hook NESMÍ házet: lokální kopie by zůstala se starou hodnotou a refetch by byl k ničemu.
 */
import {useState} from 'react';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';

export function useOptimisticRecord(record: RecordPladiasFull) {
    const [localRecord, setLocalRecord] = useState<RecordPladiasFull>(record);

    // Synchronace s prop `record` při změně id nebo timestampu – render-phase update chráněný
    // porovnáním (React docs: adjusting state when a prop changes).
    if (record.id !== localRecord.id) {
        setLocalRecord(record);
    } else if (record.lastEditTimestampNum !== localRecord.lastEditTimestampNum) {
        // Záznam se zvenčí změnil (zápis na serveru u jiného pole, než zrovna editujeme – např.
        // přenesení komentáře do poznámky sepíše `comment`). Převzít celou odpověď ze serveru a
        // zachovat v ní lokálně rozpracované hodnoty editorů: bez toho by se výsledek takové akce
        // na stránce nikdy neobjevil. Editor se řídí vlastním `draft` stavem (ne hodnota záznamu)
        // a save posílá vždy aktuální timestamp, takže o rozepsaný text nikdo nepřijde.
        setLocalRecord({...record, lastEditTimestampNum: record.lastEditTimestampNum});
    }

    return {localRecord, setLocalRecord};
}

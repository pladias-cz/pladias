/**
 * Testy useOptimisticRecord: vnější změna záznamu (refetch po akci, která sepíše pole
 * mimo lokální editory – např. přenesení komentáře do poznámky) se musí propsat do
 * lokální kopie. Dřív se přebíral jen timestamp, takže stránka /atlas/record po
 * „přidat text do poznámky“.showla pořád starou poznámku.
 */

import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';
import {useOptimisticRecord} from './useOptimisticRecord';

const makeRecord = (overrides: Partial<RecordPladiasFull> = {}): RecordPladiasFull =>
    ({
        id: 7,
        comment: 'původní poznámka',
        locality: 'lokalita',
        lastEditTimestampNum: 100,
        ...overrides,
    }) as unknown as RecordPladiasFull;

afterEach(() => {
    cleanup();
});

describe('useOptimisticRecord', () => {
    it('při vnější změně timestampu přebere i ostatní pole ze serveru', () => {
        const {result, rerender} = renderHook(
            ({record}: {record: RecordPladiasFull}) => useOptimisticRecord(record),
            {initialProps: {record: makeRecord()}},
        );

        expect(result.current.localRecord.comment).toBe('původní poznámka');

        // server po přenesení komentáře vrátil poznámku s přilepeným textem a nový timestamp
        rerender({
            record: makeRecord({
                comment: 'původní poznámka\ntext komentáře',
                lastEditTimestampNum: 200,
            }),
        });

        expect(result.current.localRecord.comment).toBe('původní poznámka\ntext komentáře');
        expect(result.current.localRecord.lastEditTimestampNum).toBe(200);
    });

    it('přepíše lokální kopii serverovou verzí (editor má vlastní draft)', () => {
        const {result, rerender} = renderHook(
            ({record}: {record: RecordPladiasFull}) => useOptimisticRecord(record),
            {initialProps: {record: makeRecord()}},
        );

        act(() => {
            result.current.setLocalRecord((prev: RecordPladiasFull) => ({
                ...prev,
                locality: 'dosud neuložená lokality',
            }));
        });

        rerender({record: makeRecord({locality: 'uložená lokality', comment: 'psáno jiným', lastEditTimestampNum: 200})});

        expect(result.current.localRecord.locality).toBe('uložená lokality');
        expect(result.current.localRecord.comment).toBe('psáno jiným');
    });

    it('při změně id přebírá záznam celý', () => {
        const {result, rerender} = renderHook(
            ({record}: {record: RecordPladiasFull}) => useOptimisticRecord(record),
            {initialProps: {record: makeRecord()}},
        );

        rerender({record: makeRecord({id: 8, comment: 'jiný záznam', lastEditTimestampNum: undefined})});

        expect(result.current.localRecord.id).toBe(8);
        expect(result.current.localRecord.comment).toBe('jiný záznam');
    });
});

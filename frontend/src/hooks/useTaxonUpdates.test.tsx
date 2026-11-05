/**
 * Testy optimistické vrstvy mutací taxonMapSettings (useTaxonUpdates):
 *  - změna statusu se lokálně projeví okamžitě a po úspěchu se převezme
 *    nový lastEditTimestamp z odpovědi,
 *  - po neúspěchu (HTTP 200 + success:false → ApiError z ensureSuccess)
 *    se hodnota vrátí a chyba jde do errorCallback (toast řeší volající),
 *  - updatingTaxonId signalizuje běžící mutaci jen mezi startem a koncem.
 *
 * `apiPost` je mocknuté; ApiError/ensureSuccess z apiClient zůstávají reálné
 * (stejný vzor jako TaxaList.test.tsx – testuje se celý řetězec).
 */

import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useTaxonUpdates} from '@/hooks/useTaxonUpdates';
import {apiPost} from '@/services/apiClient';
import type {TaxonMapSettings} from '@/models/TaxonMapSettings';
import '@/i18n/i18n';

vi.mock('@/services/apiClient', async (importOriginal) => {
    // Zbytek modulu (ApiError, ensureSuccess, apiErrorMessage…) zůstává reálný.
    const actual = await importOriginal<typeof import('@/services/apiClient')>();
    return {
        ...actual,
        apiPost: vi.fn(),
    };
});

const row: TaxonMapSettings = {
    id: 1,
    taxonId: 1,
    taxonNameLat: 'Vřesovec testovací',
    taxonRankCz: 'druh',
    isMapped: true,
    commonThreshold: 1,
    isProtected: false,
    preslia: '',
    revisors: '',
    revisorsComment: null,
    revisorsPrintComment: null,
    revisionStatusId: 1,
    revisionStatusDescription: 'Rozpracováno',
    publicationStatusId: 5,
    publicationStatusDescription: 'Nepublikováno',
    lastEditTimestamp: 1000,
    parentTaxonId: null,
    parentTaxonNameLat: null,
    csvMapDetailId: null,
    csvMapDetailTimestamp: null,
    hasPng: false,
};

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});

describe('useTaxonUpdates', () => {
    it('změna statusu se optimisticky projeví a po úspěchu převezme nový timestamp', async () => {
        vi.mocked(apiPost).mockResolvedValueOnce({success: true, timestamp: '2000'});

        const {result} = renderHook(() => useTaxonUpdates());

        // lokální kopie řádků stejně jako v TaxaList (updater aplikuje volající)
        let data = [row];
        const apply = (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => {
            data = updater(data);
        };
        const onError = vi.fn();

        await act(async () => {
            await result.current.updateRevisionStatus(row, 2, apply, onError);
        });

        expect(data[0].revisionStatusId).toBe(2);
        expect(data[0].lastEditTimestamp).toBe(2000);
        expect(onError).not.toHaveBeenCalled();
        expect(result.current.updatingTaxonId).toBeNull();

        const formData = vi.mocked(apiPost).mock.calls[0]?.[1] as FormData;
        expect(formData.get('key')).toBe('REVISIONSTATUS');
        expect(formData.get('value')).toBe('2');
        expect(formData.get('taxonId')).toBe('1');
        expect(formData.get('timestamp')).toBe('1000');
    });

    it('po neúspěchu mutace se hodnota vrátí a chyba jde do errorCallback', async () => {
        vi.mocked(apiPost).mockResolvedValueOnce({
            success: false,
            message: 'Záznam byl mezitím změněn jiným uživatelem.',
        });

        const {result} = renderHook(() => useTaxonUpdates());

        let data = [row];
        const apply = (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => {
            data = updater(data);
        };
        const onError = vi.fn();

        await act(async () => {
            await result.current.updateRevisionStatus(row, 2, apply, onError);
        });

        // rollback na původní hodnotu i timestamp
        expect(data[0].revisionStatusId).toBe(1);
        expect(data[0].lastEditTimestamp).toBe(1000);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(result.current.updatingTaxonId).toBeNull();
    });

    it('updatingTaxonId drží taxonId jen po dobu běhu mutace', async () => {
        let resolveMutation!: (payload: { success: boolean; timestamp: string }) => void;
        vi.mocked(apiPost).mockImplementation(() => new Promise((resolve) => {
            resolveMutation = resolve;
        }));

        const {result} = renderHook(() => useTaxonUpdates());

        let data = [row];
        const apply = (updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => {
            data = updater(data);
        };
        const onError = vi.fn();

        let inFlight!: Promise<void>;
        act(() => {
            inFlight = result.current.updateIsMapped(row, apply, onError);
        });

        // optimisticky přepnuto a mutace běží
        expect(data[0].isMapped).toBe(false);
        expect(result.current.updatingTaxonId).toBe(row.taxonId);

        await act(async () => {
            resolveMutation({success: true, timestamp: '3000'});
            await inFlight;
        });

        expect(data[0].isMapped).toBe(false);
        expect(data[0].lastEditTimestamp).toBe(3000);
        expect(result.current.updatingTaxonId).toBeNull();
    });
});

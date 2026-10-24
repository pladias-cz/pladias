/**
 * Regresní testy TaxaList – optimistická vrstva řádků napojená přes
 * DataTable.onDataUpdater:
 *  - změna status selectu se musí v UI projevit okamžitě (bez čekání na
 *    odpověď POSTu a bez refetche) a po úspěchu zůstat,
 *  - po selhání mutace se hodnota vrátí a chybový toast nese hlášku backendu.
 *
 * Zachycují past „setState s funkčním argumentem“: kdyby si TaxaList uložil
 * updater z onDataUpdater přímo do useState, React by funkci vykonal jako
 * funkční updater a uložil její návratovou hodnotu (undefined) – registrace
 * by se tiše ztratila a select by se vracel na původní hodnotu až do
 * manuálního refresh (viz docs/gotchas.md).
 */

import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import TaxaList from './TaxaList';
import {withQueryClient} from '@/test/withQueryClient';
import {apiGet, apiPost} from '@/services/apiClient';
import {useNotificationStore} from '@/stores/notificationStore';
import type {TaxonMapSettings} from './taxaList/types';
import '@/i18n/i18n';

vi.mock('@/services/apiClient', async (importOriginal) => {
    // Zbytek modulu (ApiError, ensureSuccess, apiErrorMessage…) zůstává
    // reálný – testuje se i řetězec „success:false → ApiError → toast“.
    const actual = await importOriginal<typeof import('@/services/apiClient')>();
    return {
        ...actual,
        apiGet: vi.fn(),
        apiPost: vi.fn(),
    };
});

const revisionStatuses = [
    {id: 1, description: 'Rozpracováno', priority: 1},
    {id: 2, description: 'Dokončeno', priority: 2},
];
const publicationStatuses = [
    {id: 5, description: 'Nepublikováno', priority: 1},
    {id: 6, description: 'Publikováno', priority: 2},
];

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
    // vyplněný rodič → MappedCell nekreslí autocomplete (žádná další síťová volání)
    parentTaxonId: 99,
    parentTaxonNameLat: 'Parent maximus',
    csvMapDetailId: null,
    csvMapDetailTimestamp: null,
    hasPng: false,
};

function mockCatalogsAndRows() {
    vi.mocked(apiGet).mockImplementation(async (url: string) => {
        // číselníky jdou přes requireData – obálka {success, data}
        if (url.includes('revision-statuses')) return {success: true, data: revisionStatuses};
        if (url.includes('publication-statuses')) return {success: true, data: publicationStatuses};
        // /api/react/atlasadmin/taxa – širší obálka s polem taxa
        return {success: true, taxa: [row], totalCount: 1, filteredCount: 1};
    });
}

function renderTaxaList() {
    return render(
        withQueryClient(
            <MemoryRouter>
                <TaxaList/>
            </MemoryRouter>
        )
    );
}

/** Status select v buňce řádku – combobox s aktuálně vybranou hodnotou statusu. */
function statusSelect(value: string): HTMLSelectElement {
    const select = screen
        .getAllByRole('combobox')
        .find((el) => (el as HTMLSelectElement).value === value);
    if (!select) throw new Error(`Select s hodnotou "${value}" nenalezen`);
    return select as HTMLSelectElement;
}

describe('TaxaList optimistic updates', () => {
    afterEach(() => {
        cleanup();
        vi.resetAllMocks();
        // notifikační store je globální – toasty z testů nesmí vytéct do dalších
        useNotificationStore.getState().clear();
    });

    it('změna statusu se v selectu projeví okamžitě a po úspěchu zůstane', async () => {
        mockCatalogsAndRows();
        let resolveMutation!: (payload: { success: boolean; timestamp: string }) => void;
        vi.mocked(apiPost).mockImplementation(() => new Promise((resolve) => {
            resolveMutation = resolve;
        }));

        renderTaxaList();

        // řádek i číselníky se načetly – status select ukazuje hodnotu z dat
        await screen.findByText('Vřesovec testovací');
        await waitFor(() => expect(statusSelect('1')).toBeTruthy());

        const select = statusSelect('1');
        fireEvent.change(select, {target: {value: '2'}});

        // optimisticky: nová hodnota je vidět hned, POST stále běží
        expect(select.value).toBe('2');
        expect(apiPost).toHaveBeenCalledTimes(1);
        expect(apiPost).toHaveBeenCalledWith(
            '/api/react/atlasadmin/taxonMapSettings',
            expect.any(FormData)
        );
        const formData = vi.mocked(apiPost).mock.calls[0]?.[1] as FormData;
        expect(formData.get('key')).toBe('REVISIONSTATUS');
        expect(formData.get('value')).toBe('2');
        expect(formData.get('taxonId')).toBe('1');

        // úspěch z backendu – hodnota zůstává (a v datech je čerstvý timestamp)
        await act(async () => {
            resolveMutation({success: true, timestamp: '2000'});
        });
        expect(statusSelect('2')).toBe(select);
    });

    it('po selhání mutace se hodnota selectu vrátí a chyba jde do toastu', async () => {
        mockCatalogsAndRows();
        // neúspěch mutace: HTTP 200 + success:false s hláškou backendu
        vi.mocked(apiPost).mockResolvedValueOnce({
            success: false,
            message: 'Záznam byl mezitím změněn jiným uživatelem.',
        });

        renderTaxaList();

        await screen.findByText('Vřesovec testovací');
        await waitFor(() => expect(statusSelect('5')).toBeTruthy());

        const select = statusSelect('5');
        fireEvent.change(select, {target: {value: '6'}});

        // optimisticky přepnuto…
        expect(select.value).toBe('6');

        // …a po neúspěchu rollback na původní hodnotu
        await waitFor(() => expect(select.value).toBe('5'));

        // chybu hlásí rodič notifikačním storem (toast) s hláškou backendu
        const notifications = useNotificationStore.getState().notifications;
        expect(notifications).toHaveLength(1);
        expect(notifications[0]?.type).toBe('danger');
        expect(notifications[0]?.message).toBe('Záznam byl mezitím změněn jiným uživatelem.');
    });
});

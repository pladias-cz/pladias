/**
 * Testy tabů výsledků: tlačítko hromadných úprav je MIMO taby (viditelné pro
 * všechny), otevírá offcanvas s children (BulkEdit jen pro editory); tabulkový
 * výpis v tabu Tabulka nemá tlačítko „Nové hledání" (Reset je v řádce filtrů);
 * mapový výpis i dashboard se mountují lazy – až po překliknutí na tab.
 * PladiasRecordsTable, ResultsMap i ResultsDashboard jsou mocknuté – jejich
 * chování pokrývají vlastní testy.
 */

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import '@/i18n/i18n';
import type {RecordPladias} from '@/models';
import {ResultsTabs} from './ResultsTabs';
import type {SearchQuery} from '../hooks/useSearchQuery';

vi.mock('@/components/atlas/mapDetail/PladiasRecordsTable', () => ({
    PladiasRecordsTable: () => <div data-testid="records-table"/>,
}));

vi.mock('./ResultsMap', () => ({
    ResultsMap: ({payloadEntries}: {payloadEntries: unknown[]}) => (
        <div data-testid="results-map">{payloadEntries.length}</div>
    ),
}));

vi.mock('./ResultsDashboard', () => ({
    // React.lazy očekává default export
    default: () => <div data-testid="results-dashboard"/>,
}));

const query = {
    records: [{id: 1}] as unknown as RecordPladias[],
    currentPage: 1,
    pageSize: 50,
    totalCount: 1,
    isLoading: false,
    submitMessage: '',
    lastPayloadEntries: [['taxon_name', 'Carex']] as Array<[string, FormDataEntryValue]>,
    sortBy: null,
    sortOrder: 'asc' as const,
    search: vi.fn(),
    changePage: vi.fn(),
    changeSort: vi.fn(),
    changePageSize: vi.fn(),
    refreshAfterBulkEdit: vi.fn(),
    reset: vi.fn(),
} satisfies SearchQuery;

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ResultsTabs', () => {
    it('vykreslí čtyři taby a tabulkový výpis bez tlačítka „Nové hledání"', () => {
        render(<ResultsTabs query={query} onExport={vi.fn()} exportLoading={false} exportMessage="" exportHint="hint"/>);

        expect(screen.getByRole('tab', {name: 'Tabulka'})).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: 'Mapa'})).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: 'Dashboard'})).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: 'Download'})).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Nové hledání'})).toBeNull();
    });

    it('s children (BulkEdit) je tlačítko hromadných úprav mimo taby a otevře offcanvas', () => {
        render(
            <ResultsTabs query={query} onExport={vi.fn()} exportLoading={false} exportMessage="" exportHint="hint">
                <div>BULK_EDIT_CONTENT</div>
            </ResultsTabs>,
        );

        // tlačítko existuje, ale není to tab
        const bulkEditButton = screen.getByRole('button', {name: 'Hromadné úpravy'});
        expect(bulkEditButton.closest('[role="tablist"]')).toBeNull();

        // zavřený offcanvas – obsah (children) není v DOM
        expect(screen.queryByText('BULK_EDIT_CONTENT')).toBeNull();

        fireEvent.click(bulkEditButton);

        expect(screen.getByText('BULK_EDIT_CONTENT')).toBeInTheDocument();
    });

    it('bez children (uživatel bez oprávnění) se tlačítko hromadných úprav nezobrazí', () => {
        render(<ResultsTabs query={query} onExport={vi.fn()} exportLoading={false} exportMessage="" exportHint="hint"/>);

        expect(screen.queryByRole('button', {name: 'Hromadné úpravy'})).toBeNull();
    });

    it('položka s taby má flex-basis 0 – tlačítko hromadných úprav nezalamuje pod tabulku', () => {
        render(
            <ResultsTabs query={query} onExport={vi.fn()} exportLoading={false} exportMessage="" exportHint="hint">
                <div>BULK_EDIT_CONTENT</div>
            </ResultsTabs>,
        );

        // jsdom nepočítá layout (flex wrap), proto regresační pojistka na styl:
        // flex-grow-1 nechává basis auto → hypotetická šířka položky je dána
        // tabulkou uvnitř a tlačítko vypadne z flex-wrap na další řádku pod
        // celou tabulku (až na konec stránky)
        const bulkEditButton = screen.getByRole('button', {name: 'Hromadné úpravy'});
        const tabsItem = bulkEditButton.parentElement?.firstElementChild as HTMLElement;
        expect(tabsItem.style.flexBasis).toBe('0%');
        expect(tabsItem.style.minWidth).toBe('0px');
    });

    it('mapový výpis se mountuje lazy – až po překliknutí na tab Mapa (dostane payload hledání)', () => {
        render(<ResultsTabs query={query} onExport={vi.fn()} exportLoading={false} exportMessage="" exportHint="hint"/>);

        // před překliknutím se mapový obsah (a dotaz na kvadranty) nenačítá
        expect(screen.queryByTestId('results-map')).toBeNull();

        fireEvent.click(screen.getByRole('tab', {name: 'Mapa'}));

        // po překliknutí mount + předání filtrů posledního hledání
        const resultsMap = screen.getByTestId('results-map');
        expect(resultsMap).toBeInTheDocument();
        expect(resultsMap).toHaveTextContent('1');
    });

    it('dashboard se mountuje lazy – až po překliknutí na tab Dashboard', async () => {
        render(<ResultsTabs query={query} onExport={vi.fn()} exportLoading={false} exportMessage="" exportHint="hint"/>);

        // před překliknutím se dashboard (ani recharts chunk) nenačítá
        expect(screen.queryByTestId('results-dashboard')).toBeNull();

        fireEvent.click(screen.getByRole('tab', {name: 'Dashboard'}));

        expect(await screen.findByTestId('results-dashboard')).toBeInTheDocument();
    });
});

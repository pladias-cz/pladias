/**
 * Testy tabů výsledků: tlačítko hromadných úprav je MIMO taby (viditelné pro
 * všechny), otevírá offcanvas s children (BulkEdit jen pro editory); tabulkový
 * výpis v tabu Tabulka nemá tlačítko „Nové hledání" (Reset je v řádce filtrů).
 * PladiasRecordsTable je mocknutá – její chování pokrývá vlastní test.
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

const query = {
    records: [{id: 1}] as unknown as RecordPladias[],
    currentPage: 1,
    pageSize: 50,
    totalCount: 1,
    isLoading: false,
    submitMessage: '',
    lastPayloadEntries: [],
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
});

/**
 * Testy výsledků vyhledávání: standardní paginace s volbou počtu řádků
 * (DataTablePagination), počet zobrazených záznamů (DataRowCount), předání
 * řazení do hlaviček tabulky záznamů a degradovaný režim bez známého total.
 *
 * PladiasRecordsTable je mocknutá – její vlastní chování (včetně řaditelných
 * hlaviček) pokrývá PladiasRecordsTable.test.tsx.
 */

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {RecordPladias} from '@/models';
import {SearchResultsView} from './SearchResultsView';
import '@/i18n/i18n';

vi.mock('@/components/atlas/mapDetail/PladiasRecordsTable', () => ({
    PladiasRecordsTable: ({onHeaderSort}: {onHeaderSort?: (sortBy: string) => void}) => (
        <div data-testid="records-table" onClick={() => onHeaderSort?.('taxonName')}/>
    ),
}));

const records = [
    {id: 1}, {id: 2}, {id: 3},
] as unknown as RecordPladias[];

const baseProps = {
    records,
    totalCount: 120,
    currentPage: 2,
    pageSize: 50,
    pageSizeOptions: [10, 20, 50, 100],
    isLoading: false,
    sortBy: 'taxonName',
    sortDescending: false,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onSortChange: vi.fn(),
    onNewSearch: vi.fn(),
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('SearchResultsView', () => {
    it('vykreslí standardní paginaci: aktivní stránka, volbu počtu řádků i počet záznamů', () => {
        render(<SearchResultsView {...baseProps}/>);

        // 120 záznamů po 50 = 3 stránky, aktivní druhá
        expect(screen.getByText('2').closest('li')).toHaveClass('active');
        expect(screen.getByLabelText('Řádků na stránku', {exact: false})).toBeInTheDocument();
        // DataRowCount: zobrazeno 51–53 z 120
        expect(screen.getByText('Zobrazeno od 51 do 53 z 120 řádků celkem')).toBeInTheDocument();
    });

    it('změna počtu řádků na stránku volá onPageSizeChange', () => {
        render(<SearchResultsView {...baseProps}/>);

        fireEvent.change(screen.getByLabelText('Řádků na stránku', {exact: false}), {target: {value: '20'}});

        expect(baseProps.onPageSizeChange).toHaveBeenCalledWith(20);
    });

    it('klik na hlavičku tabulky přepne řazení aktivního sloupce na sestupné', () => {
        render(<SearchResultsView {...baseProps}/>);

        fireEvent.click(screen.getByTestId('records-table'));

        expect(baseProps.onSortChange).toHaveBeenCalledWith('taxonName', 'desc');
    });

    it('bez total (chybná odpověď) zůstane jen posun vpřed/vzad', () => {
        render(<SearchResultsView {...baseProps} totalCount={null}/>);

        expect(screen.getByText('Předchozí')).toBeInTheDocument();
        expect(screen.getByText('Další')).toBeInTheDocument();
        expect(screen.queryByLabelText('Řádků na stránku', {exact: false})).toBeNull();
    });
});

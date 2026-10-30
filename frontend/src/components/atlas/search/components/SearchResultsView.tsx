/**
 * Zobrazení výsledků vyhledávání: paginace a počet řádků z core DataTable
 * (včetně volby počtu řádků na stránku), řazení kliknutím na hlavičku
 * sloupce tabulky záznamů. BulkEdit se vkládá jako children (jen pro editory).
 */

import type {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {PladiasRecordsTable} from '@/components/atlas/mapDetail/PladiasRecordsTable';
import type {RecordPladias} from '@/models';
import {DataRowCount, DataTablePagination} from '@/core/dataTable';
import {computeTotalPages} from '../searchRequest';

interface SearchResultsViewProps {
    records: RecordPladias[];
    totalCount: number | null;
    currentPage: number;
    pageSize: number;
    pageSizeOptions: number[];
    isLoading: boolean;
    sortBy: string | null;
    sortDescending: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    /** Klik na řaditelnou hlavičku sloupce – sort klíč backendu a směr. */
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    onNewSearch: () => void;
    /** BulkEdit panel – jen pro mapAdmin/bulkEditor. */
    children?: ReactNode;
}

export function SearchResultsView({
                                      records,
                                      totalCount,
                                      currentPage,
                                      pageSize,
                                      pageSizeOptions,
                                      isLoading,
                                      sortBy,
                                      sortDescending,
                                      onPageChange,
                                      onPageSizeChange,
                                      onSortChange,
                                      onNewSearch,
                                      children,
                                  }: SearchResultsViewProps) {
    const {t} = useTranslation();

    const totalPages = computeTotalPages(totalCount, pageSize);
    const canGoPrev = currentPage > 1 && !isLoading;
    // bez total (chybná odpověď) dovolíme listovat, dokud se vrací plné stránky
    const canGoNext = totalPages != null
        ? currentPage < totalPages && !isLoading
        : records.length === pageSize && !isLoading;

    /** Klik na hlavičku: jiný sloupec vzestupně, aktivní sloupec přepíná asc/desc. */
    const handleHeaderSort = (nextSortBy: string) => {
        const nextOrder = nextSortBy === sortBy && !sortDescending ? 'desc' : 'asc';
        onSortChange(nextSortBy, nextOrder);
    };

    return (
        <div className="mt-4">
            {totalPages != null ? (
                <DataTablePagination
                    page={currentPage}
                    pageSize={pageSize}
                    totalPages={totalPages}
                    totalCount={totalCount ?? 0}
                    filteredCount={totalCount ?? 0}
                    hasActiveFilters={false}
                    pageSizeOptions={pageSizeOptions}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            ) : (
                // degradovaný režim bez známého total: pouze posun vpřed/vzad
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!canGoPrev}
                        onClick={() => onPageChange(currentPage - 1)}
                    >
                        {t('atlas.search.grid.previous')}
                    </button>
                    <span className="small text-muted">
                        {t('atlas.search.grid.page', {page: currentPage})}
                    </span>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!canGoNext}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        {t('atlas.search.grid.next')}
                    </button>
                    {isLoading && <span className="small text-muted">{t('common.loading')}</span>}
                </div>
            )}

            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                <DataRowCount
                    fromIndex={(currentPage - 1) * pageSize + 1}
                    toIndex={(currentPage - 1) * pageSize + records.length}
                    total={totalCount ?? records.length}
                    loading={isLoading}
                />
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={isLoading}
                    onClick={onNewSearch}
                >
                    {t('atlas.search.grid.newSearch')}
                </button>
            </div>

            <div className="w-100">
                <PladiasRecordsTable
                    records={records}
                    showTaxonName={true}
                    showFullQuadrantCode={true}
                    sort={{sortBy, descending: sortDescending}}
                    onHeaderSort={handleHeaderSort}
                />
            </div>

            {children}
        </div>
    );
}

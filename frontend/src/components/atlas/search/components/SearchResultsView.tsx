/**
 * Zobrazení výsledků vyhledávání: jediná řádka ovládání nad tabulkou – volba počtu
 * řádků na stránku a paginace z core DataTable, počet zobrazených záznamů
 * (DataRowCount) i tlačítko „Rozbalit vše“ (řízený režim PladiasRecordsTable),
 * vše pohromadě kvůli prostoru pro záznamy. Řazení kliknutím na hlavičku
 * sloupce tabulky záznamů. BulkEdit se vkládá jako children (jen pro editory)
 * a zobrazuje se v offcanvasu ze spodu – otevírá ho tlačítko „Hromadné
 * úpravy“ v téže řádce ovládání.
 */

import {useState, type ReactNode} from 'react';
import {Offcanvas} from 'react-bootstrap';
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
    /** Reset („Nové hledání"). Nepovinné – bez něj se tlačítko nevykreslí
     * (pokročilé vyhledávání má Reset v řádce filtrů). */
    onNewSearch?: () => void;
    /** BulkEdit panel – jen pro mapAdmin/bulkEditor; vykresluje se v offcanvasu ze spodu. */
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
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    // Rozbalené řádky: stav drží rodič, aby tlačítko „Rozbalit vše“ mohlo sedět
    // v jedné řádce s paginací (PladiasRecordsTable v řízeném režimu).
    const [expandedRecordIds, setExpandedRecordIds] = useState<Set<number>>(new Set());

    const totalPages = computeTotalPages(totalCount, pageSize);
    const canGoPrev = currentPage > 1 && !isLoading;
    // bez total (chybná odpověď) dovolíme listovat, dokud se vrací plné stránky
    const canGoNext = totalPages != null
        ? currentPage < totalPages && !isLoading
        : records.length === pageSize && !isLoading;

    // Prune ids řádků, které zmizely z `records` (přechod na jinou stránku sbalí
    // rozbalené řádky) – stejný render-phase pattern jako v PladiasRecordsTable.
    const [prevRecords, setPrevRecords] = useState(records);
    if (records !== prevRecords) {
        setPrevRecords(records);
        const validRecordIds = new Set(records.map((record) => record.id));
        setExpandedRecordIds((prev) => {
            const next = new Set(Array.from(prev).filter((id) => validRecordIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }

    const isAllExpanded = records.length > 0 && expandedRecordIds.size === records.length;

    /** Klik na hlavičku: jiný sloupec vzestupně, aktivní sloupec přepíná asc/desc. */
    const handleHeaderSort = (nextSortBy: string) => {
        const nextOrder = nextSortBy === sortBy && !sortDescending ? 'desc' : 'asc';
        onSortChange(nextSortBy, nextOrder);
    };

    const toggleExpandAll = () => {
        setExpandedRecordIds(isAllExpanded ? new Set() : new Set(records.map((record) => record.id)));
    };

    // Společné prvky jediné řádky ovládání – pro standardní i degradovanou paginaci.
    const rowCount = (
        <DataRowCount
            fromIndex={(currentPage - 1) * pageSize + 1}
            toIndex={(currentPage - 1) * pageSize + records.length}
            total={totalCount ?? records.length}
            loading={isLoading}
        />
    );
    const expandAllButton = records.length > 0 && (
        <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={toggleExpandAll}
        >
            {isAllExpanded ? t('atlas.mapDetail.collapseAll') : t('atlas.mapDetail.expandAll')}
        </button>
    );
    const actionButtons = (
        <>
            {onNewSearch && (
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={isLoading}
                    onClick={onNewSearch}
                >
                    {t('atlas.search.grid.newSearch')}
                </button>
            )}
            {children && (
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowBulkEdit(true)}
                >
                    {t('atlas.search.bulkEdit.openButton')}
                </button>
            )}
        </>
    );

    return (
        <div className="mt-4">
            {/* Jediná řádka ovládání nad tabulkou: „Řádků na stránku“, zobrazeno x z y,
                „Rozbalit vše“ a paginace (+ akční tlačítka) – šetří prostor pro záznamy. */}
            <div className="mb-3">
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
                        leftSlot={rowCount}
                        rightSlot={
                            <>
                                {expandAllButton}
                                {actionButtons}
                            </>
                        }
                    />
                ) : (
                    // degradovaný režim bez známého total: posun vpřed/vzad v jedné řádce
                    <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                        {rowCount}
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            {expandAllButton}
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
                            {actionButtons}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-100">
                <PladiasRecordsTable
                    records={records}
                    showTaxonName={true}
                    showFullQuadrantCode={true}
                    sort={{sortBy, descending: sortDescending}}
                    onHeaderSort={handleHeaderSort}
                    expandedRecordIds={expandedRecordIds}
                    onExpandedRecordIdsChange={setExpandedRecordIds}
                />
            </div>

            {children && (
                <Offcanvas
                    show={showBulkEdit}
                    onHide={() => setShowBulkEdit(false)}
                    placement="bottom"
                    className="bulk-edit-offcanvas"
                >
                    <Offcanvas.Header closeButton closeLabel={t('common.close')}>
                        <Offcanvas.Title>{t('atlas.search.bulkEdit.title')}</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        {children}
                    </Offcanvas.Body>
                </Offcanvas>
            )}
        </div>
    );
}

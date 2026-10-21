/**
 * Zobrazení výsledků vyhledávání (E.1 z refactor.md): paginace, řazení
 * a tabulka záznamů. BulkEdit se vkládá jako children (jen pro editory).
 */

import type {ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {PladiasRecordsTable} from "@/components/atlas/mapDetail/PladiasRecordsTable";
import type {RecordPladias} from "@/models";
import {DEFAULT_PAGE_SIZE, computeTotalPages, getVisiblePages} from "../searchRequest";
import type {SortOption} from "../types";

interface SearchResultsViewProps {
    records: RecordPladias[];
    totalCount: number | null;
    currentPage: number;
    isLoading: boolean;
    sortBy: string | null;
    sortDescending: boolean;
    sortOptions: SortOption[];
    onPageChange: (page: number) => void;
    /** Změna sort pole (sestupnost si volající řeší přes sortDescending). */
    onSortChange: (sortBy: string | null) => void;
    onSortDescendingChange: (descending: boolean) => void;
    onNewSearch: () => void;
    /** BulkEdit panel – jen pro mapAdmin/bulkEditor. */
    children?: ReactNode;
}

export function SearchResultsView({
    records,
    totalCount,
    currentPage,
    isLoading,
    sortBy,
    sortDescending,
    sortOptions,
    onPageChange,
    onSortChange,
    onSortDescendingChange,
    onNewSearch,
    children,
}: SearchResultsViewProps) {
    const {t} = useTranslation();

    const totalPages = computeTotalPages(totalCount);
    const visiblePages = getVisiblePages(currentPage, totalPages);
    const canGoPrev = currentPage > 1 && !isLoading;
    // bez total (chybná odpověď) dovolíme listovat, dokud se vrací plné stránky
    const canGoNext = totalPages != null
        ? currentPage < totalPages && !isLoading
        : records.length === DEFAULT_PAGE_SIZE && !isLoading;

    return (
        <div className="mt-4">
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!canGoPrev}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    {t("atlas.search.grid.previous")}
                </button>

                {visiblePages.map((pageNumber) => (
                    <button
                        key={pageNumber}
                        type="button"
                        className={`btn btn-sm ${pageNumber === currentPage ? "btn-primary" : "btn-outline-secondary"}`}
                        disabled={isLoading || pageNumber === currentPage}
                        onClick={() => onPageChange(pageNumber)}
                    >
                        {pageNumber}
                    </button>
                ))}

                <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!canGoNext}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    {t("atlas.search.grid.next")}
                </button>

                <span className="small text-muted ms-2">
                    {totalPages != null
                        ? t("atlas.search.grid.pageOf", {page: currentPage, totalPages})
                        : t("atlas.search.grid.page", {page: currentPage})}
                </span>
                {totalCount != null && (
                    <span className="small text-muted">
                        {t("atlas.search.grid.totalFound", {totalCount})}
                    </span>
                )}
                {isLoading && <span className="small text-muted">{t("common.loading")}</span>}

                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm ms-auto"
                    disabled={isLoading}
                    onClick={onNewSearch}
                >
                    {t("atlas.search.grid.newSearch")}
                </button>
            </div>

            <div className="w-100 mt-3">
                <label htmlFor="recordsSortSelect" className="form-label mb-1">
                    {t("atlas.search.form.sortLabel")}
                </label>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                    <select
                        id="recordsSortSelect"
                        className="form-select form-select-sm"
                        style={{maxWidth: 280}}
                        value={sortBy ?? "taxonName"}
                        onChange={(event) => onSortChange(event.target.value || "taxonName")}
                        disabled={isLoading}
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <div className="form-check">
                        <input
                            id="recordsSortDescending"
                            className="form-check-input"
                            type="checkbox"
                            checked={sortDescending}
                            onChange={(event) => onSortDescendingChange(event.target.checked)}
                            disabled={isLoading || !sortBy}
                        />
                        <label className="form-check-label" htmlFor="recordsSortDescending">
                            {t("atlas.search.form.sortDescending")}
                        </label>
                    </div>
                </div>
            </div>

            <PladiasRecordsTable
                records={records}
                showTaxonName={true}
            />

            {children}
        </div>
    );
}

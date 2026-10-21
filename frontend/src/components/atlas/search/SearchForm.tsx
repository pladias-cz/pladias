/**
 * Vyhledávací formulář atlasu (E.1 z refactor.md) – tenká koordinační
 * komponenta: filtry (useSearchFilters), číselníky (useSearchOptions),
 * dotaz (useSearchQuery) a layout polí. Bez přímého fetche.
 */

import {type FormEvent, useMemo} from "react";
import {useTranslation} from "react-i18next";
import {useInstanceConfig} from "@/context/InstanceConfigContext";
import {useProjectName} from "@/context/ProjectNameContext";
import {useUser} from "@/context/UserContext";
import {createTaxaImportableProvider} from "@/components/autocomplete/TaxaImportableProvider";
import BulkEdit from "@/components/atlas/search/BulkEdit";
import {SearchFilterColumnOne, SearchFilterColumnTwo, SearchResultsView} from "./components";
import {useSearchFilters, useSearchOptions, useSearchQuery} from "./hooks";
import type {SortOption, TypeaheadOption} from "./types";
import "./SearchForm.scss";

export default function SearchForm() {
    const {t} = useTranslation();
    const user = useUser();
    const config = useInstanceConfig() as {isVascular?: boolean};
    const {projectName} = useProjectName() as {projectName?: string};

    const isVascular = Boolean(config.isVascular);

    const projectNameText = (projectName ?? "Pladias").trim() || "Pladias";

    const options = useSearchOptions();
    const filters = useSearchFilters();
    const query = useSearchQuery();

    const canUseBulkEdit = user.isMapAdmin || user.isBulkEditor;
    const hasRecords = query.records.length > 0;

    const excelExportTitle = useMemo(() => {
        if (user.isMapAdmin) {
            return t("atlas.search.form.excelExportTitleAdmin");
        }
        return t("atlas.search.form.excelExportTitleRestricted");
    }, [t, user.isMapAdmin]);

    const taxonProvider = useMemo(
        () => createTaxaImportableProvider(t("atlas.search.form.taxonAutocompletePlaceholder")),
        [t]
    );

    const validationStatusOptions = useMemo<TypeaheadOption[]>(() => ([
        {id: 3, label: t("atlas.search.form.options.validationValid")},
        {id: 2, label: t("atlas.search.form.options.validationInvalid")},
        {id: 1, label: t("atlas.search.form.options.validationUncertain")},
        {id: 0, label: t("atlas.search.form.options.validationNotValidated")},
    ]), [t]);

    const sortOptions = useMemo<SortOption[]>(() => [
        {value: "taxonName", label: t("atlas.search.form.sortOptions.taxonName")},
        {value: "locality", label: t("atlas.search.form.sortOptions.locality")},
        {value: "nearestTownName", label: t("atlas.search.form.sortOptions.nearestTownName")},
        {value: "date", label: t("atlas.search.form.sortOptions.date")},
        {value: "validationStatus", label: t("atlas.search.form.sortOptions.validationStatus")},
        {value: "square", label: t("atlas.search.form.sortOptions.square")},
        ...(isVascular ? [{value: "phytochorion", label: t("atlas.search.form.sortOptions.phytochorion")}] : []),
    ], [isVascular, t]);

    const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const payloadEntries = Array.from(formData.entries());

        await query.search(payloadEntries);
    };

    const handleNewSearch = () => {
        query.reset();
        filters.reset();
    };

    return (
        <>
            <div id="searchRecordsFormView" className="pladiasView" />

            {!hasRecords && (
            <form id="searchForm" className="form-horizontal" onSubmit={handleSearchSubmit}>
                <div className="row">
                    <div className="col-md-2 offset-md-3">
                        <button type="submit" name="extended_search" className="btn btn-primary btn-lg" disabled={query.isLoading}>
                            {query.isLoading && (
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                            )}
                            {query.isLoading ? t("atlas.search.form.processingRequest") : t("atlas.search.form.submit")}
                        </button>
                        {query.submitMessage && <div className="text-muted mt-2 small">{query.submitMessage}</div>}
                        {query.isLoading && <div className="text-muted mt-2 small">{t("atlas.search.form.waitingForData")}</div>}
                        <br />
                    </div>
                    <div className="btn-group col-md-4" role="group">
                        <div className="radio-inline">
                            <label>
                                <input type="radio" name="export_type" value="browser" defaultChecked />
                                {t("atlas.search.form.exportBrowser")}
                            </label>
                        </div>
                        <div className="radio-inline">
                            <label>
                                <a
                                    tabIndex={0}
                                    role="button"
                                    data-bs-toggle="popover"
                                    data-bs-placement="bottom"
                                    data-bs-trigger="focus"
                                    data-bs-html="true"
                                    title={excelExportTitle}
                                >
                                    <input type="radio" name="export_type" value="excel" />
                                </a>
                                {t("atlas.search.form.exportExcel")}
                            </label>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <SearchFilterColumnOne
                        filters={filters}
                        options={options}
                        isVascular={isVascular}
                        projectNameText={projectNameText}
                        taxonProvider={taxonProvider}
                    />

                    <SearchFilterColumnTwo
                        filters={filters}
                        options={options}
                        isVascular={isVascular}
                        projectNameText={projectNameText}
                        validationStatusOptions={validationStatusOptions}
                    />
                </div>
            </form>
            )}

            {hasRecords && (
                <SearchResultsView
                    records={query.records}
                    totalCount={query.totalCount}
                    currentPage={query.currentPage}
                    isLoading={query.isLoading}
                    sortBy={query.sortBy}
                    sortDescending={query.sortDescending}
                    sortOptions={sortOptions}
                    onPageChange={query.changePage}
                    onSortChange={(nextSortBy) => {
                        void query.changeSort(nextSortBy, query.sortDescending ? "desc" : "asc");
                    }}
                    onSortDescendingChange={(nextDescending) => {
                        query.setSortDescending(nextDescending);
                        if (query.sortBy) {
                            void query.changeSort(query.sortBy, nextDescending ? "desc" : "asc");
                        }
                    }}
                    onNewSearch={handleNewSearch}
                >
                    {canUseBulkEdit && (
                        <BulkEdit
                            records={query.records}
                            totalCount={query.totalCount}
                            searchPayloadEntries={query.lastPayloadEntries}
                            onBulkEditComplete={query.refreshAfterBulkEdit}
                        />
                    )}
                </SearchResultsView>
            )}

        </>
    );
}

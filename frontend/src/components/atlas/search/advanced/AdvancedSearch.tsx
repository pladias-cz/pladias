/**
 * Pokročilé vyhledávání – tenký orchestrátor (vzor SearchForm): hodnoty
 * filtrů (advancedSearchStore), viditelnost filtrů (useFilterVisibility),
 * číselníky (useSearchOptions), dotaz (useSearchQuery), export
 * (useAdvancedSearchExport) a layout (FilterChipRow + ResultsTabs).
 * Bez přímého fetche.
 */

import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useInstanceConfig} from '@/context/InstanceConfigContext';
import {useUser} from '@/context/UserContext';
import {createTaxaImportableProvider} from '@/components/autocomplete/TaxaImportableProvider';
import BulkEdit from '@/components/atlas/search/BulkEdit';
import {useSearchOptions, useSearchQuery} from '../hooks';
import {buildSearchFormData, EXCEL_EXPORT_TYPE} from '../searchRequest';
import type {TypeaheadOption} from '../types';
import {buildAdvancedSearchPayload, hasFilterValues, payloadEntriesEqual} from './advancedSearchRequest';
import {useAdvancedSearchStore, useAdvancedSearchUserGuard} from './advancedSearchStore';
import {FilterChipRow} from './FilterChipRow';
import {ResultsTabs} from './ResultsTabs';
import {useAdvancedSearchExport} from './useAdvancedSearchExport';
import {useFilterVisibility} from './useFilterVisibility';
import type {FilterId} from './types';
import type {TypeaheadSource} from './filterRegistry';
import './AdvancedSearch.scss';

/** Debounce auto-vyhledávání – slučuje rychlé změny více chipů do jednoho dotazu. */
const AUTO_SEARCH_DEBOUNCE_MS = 200;

export function AdvancedSearch() {
    const {t} = useTranslation();
    const user = useUser();
    const config = useInstanceConfig() as { isVascular?: boolean };
    const isVascular = Boolean(config.isVascular);

    const options = useSearchOptions();
    const query = useSearchQuery();
    const searchExport = useAdvancedSearchExport();
    const {applicableFilters, visibleIds, toggleFilter, loaded} = useFilterVisibility(isVascular);
    const values = useAdvancedSearchStore((state) => state.values);

    // Pojistka proti úniku filtrů mezi uživateli (logout → login ve stejném tabu).
    useAdvancedSearchUserGuard(user.id);

    const taxonProvider = useMemo(
        () => createTaxaImportableProvider(t('atlas.search.form.taxonAutocompletePlaceholder')),
        [t]
    );

    const validationStatusOptions = useMemo<TypeaheadOption[]>(() => ([
        {id: 3, label: t('atlas.search.form.options.validationValid')},
        {id: 2, label: t('atlas.search.form.options.validationInvalid')},
        {id: 1, label: t('atlas.search.form.options.validationUncertain')},
        {id: 0, label: t('atlas.search.form.options.validationNotValidated')},
    ]), [t]);

    const optionsBySource = useMemo<Record<TypeaheadSource, TypeaheadOption[]>>(() => ({
        phytochorions: options.phytochorionOptions,
        herbariums: options.herbariumOptions,
        institutions: options.institutionOptions,
        projects: options.projectOptions,
        committers: options.committerOptions,
        historyFlags: options.historyFlagOptions,
        licenses: options.licenseOptions,
        validationStatus: validationStatusOptions,
    }), [options, validationStatusOptions]);

    const hasSearched = query.totalCount != null || query.records.length > 0;

    /**
     * Auto-vyhledávání po změně filtrů (zavření popoveru chipu, přepnutí
     * viditelnosti). Debounce timer čte hodnoty z closures, viditelnost přes
     * ref (efekt ji zrcadlí po každé změně; handler ji nastaví okamžitě).
     */
    const autoSearchTimer = useRef<number | null>(null);
    const visibleRef = useRef(visibleIds);
    useEffect(() => {
        visibleRef.current = visibleIds;
    }, [visibleIds]);

    const runAutoSearch = useCallback(() => {
        if (autoSearchTimer.current != null) {
            window.clearTimeout(autoSearchTimer.current);
        }
        autoSearchTimer.current = window.setTimeout(() => {
            autoSearchTimer.current = null;
            const entries = buildAdvancedSearchPayload(values, visibleRef.current, isVascular);
            // bez hodnot filtrů a bez předchozího hledání nehledáme (přeběh
            // myší přes chip nespouští dotaz na všechny záznamy)
            if (!hasSearched && !hasFilterValues(entries)) {
                return;
            }
            // beze změny payloadu se neposílá nic (pouhé zavření popoveru)
            if (payloadEntriesEqual(entries, query.lastPayloadEntries)) {
                return;
            }
            void query.search(entries);
        }, AUTO_SEARCH_DEBOUNCE_MS);
    }, [values, isVascular, hasSearched, query]);

    // Zrušení čekajícího timeru při odmontování.
    useEffect(() => () => {
        if (autoSearchTimer.current != null) {
            window.clearTimeout(autoSearchTimer.current);
        }
    }, []);

    const handleToggleVisibility = useCallback((id: FilterId) => {
        // ref hned (handler smí zapisovat ref) – timer nesměřuje starý výběr
        visibleRef.current = toggleFilter(id);
        runAutoSearch();
    }, [toggleFilter, runAutoSearch]);

    /**
     * Po refreshi / návratu na stránku: hodnoty aktivních filtrů se obnoví
     * ze sessionStorage – automaticky se spustí i vyhledávání. Čeká se na
     * načtení viditelnosti filtrů z backendu, aby se poslal správný payload.
     */
    const initialSearchDone = useRef(false);
    useEffect(() => {
        if (initialSearchDone.current || !loaded) {
            return;
        }
        initialSearchDone.current = true;
        runAutoSearch();
    }, [loaded, runAutoSearch]);

    /** Reset – vymaže hodnoty filtrů i výsledky; viditelnost filtrů zůstává (user setting). */
    const handleReset = useCallback(() => {
        useAdvancedSearchStore.getState().resetFilterValues();
        query.reset();
    }, [query]);

    const handleExport = useCallback(() => {
        const entries = buildAdvancedSearchPayload(values, visibleIds, isVascular, EXCEL_EXPORT_TYPE);
        void searchExport.run(buildSearchFormData(entries, query.sortBy, query.sortOrder));
    }, [values, visibleIds, isVascular, searchExport, query]);

    const canUseBulkEdit = user.isMapAdmin || user.isBulkEditor;
    const excelExportHint = user.isMapAdmin
        ? t('atlas.search.form.excelExportTitleAdmin')
        : t('atlas.search.form.excelExportTitleRestricted');

    return (
        <div className="advanced-search">
            <FilterChipRow
                filters={applicableFilters}
                visibleIds={visibleIds}
                onToggleVisibility={handleToggleVisibility}
                onFiltersChanged={runAutoSearch}
                taxonProvider={taxonProvider}
                optionsBySource={optionsBySource}
                isLoading={query.isLoading}
                onReset={handleReset}
            />

            {!hasSearched && (
                // submitMessage bez výsledků = chybová hláška posledního hledání
                // (počty záznamů řeší tabulkový výpis); jinak nápověda
                query.submitMessage
                    ? <p className="text-danger mt-3 mb-0">{query.submitMessage}</p>
                    : <p className="text-muted mt-3 mb-0">{t('atlas.advancedSearch.hint')}</p>
            )}

            {hasSearched && (
                <ResultsTabs
                    query={query}
                    onExport={handleExport}
                    exportLoading={searchExport.isLoading}
                    exportMessage={searchExport.message}
                    exportHint={excelExportHint}
                >
                    {canUseBulkEdit && (
                        <BulkEdit
                            records={query.records}
                            totalCount={query.totalCount}
                            searchPayloadEntries={query.lastPayloadEntries}
                            onBulkEditComplete={query.refreshAfterBulkEdit}
                        />
                    )}
                </ResultsTabs>
            )}
        </div>
    );
}

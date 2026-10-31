/**
 * Horní řádka aktivních filtrů: chipy viditelných filtrů, „+" dropdown pro
 * individuální zapnutí dalších filtrů (uspořádaný do sloupců podle kategorií)
 * a tlačítko Reset. Vyhledávání se spouští automaticky po zavření popoveru
 * chipu (onFiltersChanged) nebo změně viditelnosti (onToggleVisibility).
 * Hodnoty filtrů čte přímo ze store (advancedSearchStore) – jeho doména.
 */

import {Button} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {AutocompleteProvider} from '@/components/autocomplete/AutocompleteProvider';
import type {TaxonId} from '@/models/TaxonId';
import {useAdvancedSearchStore} from './advancedSearchStore';
import {AddFilterPopover} from './AddFilterPopover';
import {FilterChip} from './FilterChip';
import {compareFiltersByCategory, getCompanionFilter, type FilterDefinition, type TypeaheadSource} from './filterRegistry';
import type {FilterId, FilterValue} from './types';
import type {TypeaheadOption} from '../types';

interface FilterChipRowProps {
    /** Aplikovatelné filtry (bez companion) v pořadí registru. */
    filters: readonly FilterDefinition[];
    visibleIds: readonly FilterId[];
    onToggleVisibility: (id: FilterId) => void;
    /** Zavření popoveru chipu – možná změna hodnoty, spouštěč vyhledávání. */
    onFiltersChanged: () => void;
    taxonProvider: AutocompleteProvider<TaxonId>;
    /** Číselníky typeahead filtrů podle zdroje. */
    optionsBySource: Record<TypeaheadSource, TypeaheadOption[]>;
    isLoading: boolean;
    onReset: () => void;
}

export function FilterChipRow({
                                  filters,
                                  visibleIds,
                                  onToggleVisibility,
                                  onFiltersChanged,
                                  taxonProvider,
                                  optionsBySource,
                                  isLoading,
                                  onReset,
                              }: FilterChipRowProps) {
    const {t} = useTranslation();
    const values = useAdvancedSearchStore((state) => state.values);
    const setFilterValue = useAdvancedSearchStore((state) => state.setFilterValue);
    const clearFilter = useAdvancedSearchStore((state) => state.clearFilter);

    // pořadí chipů = pořadí ve „+" popoveru (kategorie, uvnitř pořadí registru)
    const visibleFilters = filters
        .filter((filter) => visibleIds.includes(filter.id))
        .sort(compareFiltersByCategory);

    const renderChip = (filter: FilterDefinition) => {
        const companion = getCompanionFilter(filter.id);
        return (
            <FilterChip
                key={filter.id}
                filter={filter}
                value={values[filter.id]}
                onChange={(value: FilterValue) => setFilterValue(filter.id, value)}
                onClear={() => clearFilter(filter.id)}
                options={filter.typeahead ? optionsBySource[filter.typeahead.source] : undefined}
                taxonProvider={filter.kind === 'taxonAutocomplete' ? taxonProvider : undefined}
                companionValue={companion ? values[companion.id] : undefined}
                onCompanionChange={companion ? (value: FilterValue) => setFilterValue(companion.id, value) : undefined}
                onPopoverClose={onFiltersChanged}
            />
        );
    };

    return (
        <div className="filter-chip-row d-flex flex-wrap align-items-center gap-2">
            {visibleFilters.map(renderChip)}

            {/* Individuální zapnutí dalších filtrů – kategorie ve sloupcích,
                přepínání bez zavření (multi-toggle). */}
            <AddFilterPopover
                filters={filters}
                visibleIds={visibleIds}
                onToggleVisibility={onToggleVisibility}
            />

            <div className="ms-auto d-flex align-items-center gap-2 flex-wrap">
                {isLoading && (
                    <span
                        className="spinner-border spinner-border-sm text-secondary"
                        role="status"
                        aria-label={t('atlas.search.form.waitingForData')}
                    />
                )}
                <Button size="sm" variant="outline-secondary" onClick={onReset} disabled={isLoading}>
                    {t('atlas.advancedSearch.filterRow.reset')}
                </Button>
            </div>
        </div>
    );
}

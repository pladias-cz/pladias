/**
 * Čisté sestavení payloadu pokročilého vyhledávání – bez Reactu, testovatelné
 * samostatně (vzor searchRequest.ts).
 *
 * Emituje jen hodnoty viditelných filtrů aplikovatelných na typ instance –
 * skrytý filtr se do dotazu neposílá (co nevidíš, to nefiltruje), jeho
 * hodnota zůstává ve store a po znovuzobrazení se vrátí na chip.
 */

import {BROWSER_EXPORT_TYPE} from '../searchRequest';
import type {SearchPayloadEntries} from '../hooks/useSearchQuery';
import {FILTER_DEFINITIONS, filterAppliesToInstance, isCheckboxChecked, type FilterDefinition} from './filterRegistry';
import type {FilterId, FilterValue, FilterValues, RangeValue} from './types';

/**
 * Backend čte committerId v podmínce JOINu bez null kontroly
 * (PageSearchService: `form.committerId != -1`) – bez výběru tedy musíme
 * poslat -1 jako starý formulář (hidden input s fallbackem -1).
 */
const COMMITTER_NO_SELECTION = '-1';

export function buildAdvancedSearchPayload(
    values: FilterValues,
    visibleIds: readonly FilterId[],
    isVascular: boolean,
    exportType: string = BROWSER_EXPORT_TYPE,
): SearchPayloadEntries {
    const visible = new Set(visibleIds);
    const entries: SearchPayloadEntries = [['export_type', exportType]];

    for (const filter of FILTER_DEFINITIONS) {
        if (!filterAppliesToInstance(filter, isVascular)) {
            continue;
        }
        // companion (podtaxony) se posílá jen s viditelným rodičem (taxonem)
        const active = filter.companionOf ? visible.has(filter.companionOf) : visible.has(filter.id);
        if (!active) {
            continue;
        }
        appendFilterEntries(entries, filter, values[filter.id]);
    }

    if (!entries.some(([key]) => key === 'committerId')) {
        entries.push(['committerId', COMMITTER_NO_SELECTION]);
    }
    return entries;
}

function appendFilterEntries(entries: SearchPayloadEntries, filter: FilterDefinition, value: FilterValue | undefined): void {
    if (filter.kind === 'checkbox') {
        // includeSubtaxa se posílá i bez uložené hodnoty (výchozí true)
        if (isCheckboxChecked(filter, value)) {
            entries.push([filter.payloadKeys[0], 'true']);
        }
        return;
    }
    if (value === undefined) {
        return;
    }
    if (filter.kind === 'checkboxGroup') {
        // zaškrtnuté volby skupiny (stav komenářů) posílají každá svůj klíč
        const selected = Array.isArray(value) ? value : [];
        for (const option of selected) {
            entries.push([String(option.id), 'true']);
        }
        return;
    }
    if (filter.kind === 'taxonAutocomplete') {
        // vícenásobný výběr taxonů – latinské názvy oddělené středníkem
        // (backend getTaxonNameValues splituje [;\r\n]+; starý formulář
        // posílá jeden název a zůstává kompatibilní)
        const selected = Array.isArray(value) ? value : [];
        const names = selected.map((option) => option.label).join(';');
        if (names) {
            entries.push([filter.payloadKeys[0], names]);
        }
        return;
    }
    if (filter.kind === 'typeahead') {
        const selected = Array.isArray(value) ? value : [];
        for (const option of selected) {
            entries.push([filter.payloadKeys[0], String(option.id)]);
        }
        return;
    }
    if (filter.kind === 'numberRange' || filter.kind === 'dateRange') {
        const range = value as RangeValue;
        if (range.from) {
            entries.push([filter.payloadKeys[0], range.from]);
        }
        if (range.to) {
            entries.push([filter.payloadKeys[1], range.to]);
        }
        return;
    }
    // text / number / textarea
    const text = String(value).trim();
    if (text) {
        entries.push([filter.payloadKeys[0], text]);
    }
}

/** Klíče, které checker hasFilterValues ignoruje (base + include_subtaxa default). */
const NON_FILTER_KEYS = new Set(['export_type', 'committerId', 'include_subtaxa']);

/**
 * Má payload skutečné hodnoty filtrů (ne jen base klíče)? Auto-vyhledávání
 * bez hodnot a bez předchozího hledání spouštět nemá smysl (dotaz na vše).
 */
export function hasFilterValues(entries: SearchPayloadEntries): boolean {
    return entries.some(([key]) => !NON_FILTER_KEYS.has(key));
}

/**
 * Shodné payloady – pořadí položek je dáno registrem, takže stačí
 * porovnat element po prvku. Auto-vyhledávání se spouští jen při změně.
 */
export function payloadEntriesEqual(a: SearchPayloadEntries, b: SearchPayloadEntries): boolean {
    return a.length === b.length
        && a.every(([key, value], index) => key === b[index][0] && value === b[index][1]);
}

/** Klíče, které filtr pro zadanou hodnotu skutečně emituje (pro sanity test). */
export function emittedKeysForFilter(filter: FilterDefinition, value: FilterValue | undefined): readonly string[] {
    const entries: SearchPayloadEntries = [];
    appendFilterEntries(entries, filter, value);
    return entries.map(([key]) => key);
}

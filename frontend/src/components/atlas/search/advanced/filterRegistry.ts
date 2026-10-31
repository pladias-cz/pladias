/**
 * Registr filtrů pokročilého vyhledávání – jediný zdroj pravdy o tom, jaké
 * filtry existují, jak se vykreslují (kind) a co odesílají do backendu
 * (payloadKeys). Nový filtr = nový záznam tady (+ případně nová větev ve
 * FilterEditoru); polygon je jen dalším kindem (polygonMap) a záznamem.
 *
 * Labely/tooltipy reuse klíčů starého formuláře (atlas.search.form.*), kde
 * nejsou interpolované (bez {{projectName}}) – pro appComment a checkboxy
 * stavu komentářů (commented/unresolvedComment) jsou v atlas.advancedSearch.filters
 * krátké labely, protože původní texty jsou celé věty s interpolací.
 */

import type {FilterCategory, FilterId, FilterKind, FilterValue, FilterValues, RangeValue} from './types';

/** Zdroj číselníků typeahead filtrů (useSearchOptions + statické volby). */
export type TypeaheadSource =
    | 'phytochorions'
    | 'herbariums'
    | 'institutions'
    | 'projects'
    | 'committers'
    | 'historyFlags'
    | 'licenses'
    | 'validationStatus';

/**
 * Volba skupiny checkboxů (kind checkboxGroup) – id je zároveň podklíč
 * hodnoty filtru i payload klíč, který zaškrtnutá volba posílá do backendu.
 */
export interface CheckboxOption {
    readonly id: string;
    readonly labelKey: string;
}

export interface FilterDefinition {
    readonly id: FilterId;
    /** Kategorie – seskupení do sloupců „+" dropdownu. */
    readonly category: FilterCategory;
    /** i18n klíč popisku chipu i vstupu. */
    readonly labelKey: string;
    /** i18n klíč nápovědy (tooltip chipu, hlavička popoveru) – jen bez interpolace. */
    readonly titleKey?: string;
    /** i18n klíč placeholderu vstupu. */
    readonly placeholderKey?: string;
    readonly kind: FilterKind;
    /** Defaultně viditelný filtr (uživatel bez vlastního nastavení). */
    readonly defaultVisible?: boolean;
    /** Doprovodný filtr – renderuje se v popoveru rodiče, ne jako samostatný chip. */
    readonly companionOf?: FilterId;
    /** Omezení na typ instance; bez scope platí pro obě. */
    readonly scope?: 'vascular' | 'nonVascular';
    /**
     * Číselný seznam id (pladiasId) – FilterEditor normalizuje vstup: jakákoli
     * sekvence znaků jiných než číslice (mezera, čárka, konec řádku, středník…)
     * se sloučí na jediný středník, ať už uživatel seznam vloží s libovolným
     * oddělovačem.
     */
    readonly idList?: boolean;
    readonly typeahead?: {
        readonly multiple?: boolean;
        readonly source: TypeaheadSource;
    };
    /** Volby skupiny checkboxů (kind checkboxGroup – stav komenářů). */
    readonly checkboxes?: readonly CheckboxOption[];
    /** Parametry FormData, které filtr emituje (dokumentace kontraktu + sanity test). */
    readonly payloadKeys: readonly string[];
}

/** Definice všech filtrů – pořadí = pořadí starého formuláře (levý, pravý sloupec), non-vascular na konci. */
export const FILTER_DEFINITIONS: readonly FilterDefinition[] = [
    // levý sloupec starého formuláře
    {
        id: 'taxonName',
        category: 'taxon',
        labelKey: 'atlas.search.form.labels.taxon',
        titleKey: 'atlas.search.form.titles.taxon',
        kind: 'taxonAutocomplete',
        defaultVisible: true,
        payloadKeys: ['taxon_name'],
    },
    {
        id: 'includeSubtaxa',
        category: 'taxon',
        labelKey: 'atlas.search.form.labels.includeSubtaxa',
        titleKey: 'atlas.search.form.titles.includeSubtaxa',
        kind: 'checkbox',
        companionOf: 'taxonName',
        payloadKeys: ['include_subtaxa'],
    },
    {
        id: 'originalName',
        category: 'taxon',
        labelKey: 'atlas.search.form.labels.originalName',
        titleKey: 'atlas.search.form.titles.originalName',
        placeholderKey: 'atlas.search.form.placeholders.originalName',
        kind: 'text',
        payloadKeys: ['taxon_name_original'],
    },
    {
        id: 'town',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.town',
        titleKey: 'atlas.search.form.titles.town',
        placeholderKey: 'atlas.search.form.placeholders.town',
        kind: 'text',
        payloadKeys: ['town'],
    },
    {
        id: 'localityDescription',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.locality',
        titleKey: 'atlas.search.form.titles.localityDescription',
        placeholderKey: 'atlas.search.form.placeholders.localityDescription',
        kind: 'text',
        defaultVisible: true,
        payloadKeys: ['locality_description'],
    },
    {
        id: 'localityOrTown',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.localityOrTown',
        titleKey: 'atlas.search.form.titles.localityOrTown',
        placeholderKey: 'atlas.search.form.placeholders.localityOrTown',
        kind: 'text',
        payloadKeys: ['locality_or_town'],
    },
    {
        id: 'localityExtra',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.localityExtra',
        titleKey: 'atlas.search.form.titles.localityExtra',
        placeholderKey: 'atlas.search.form.placeholders.localityExtra',
        kind: 'text',
        scope: 'nonVascular',
        payloadKeys: ['localityExtra'],
    },
    {
        id: 'altitude',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.altitude',
        titleKey: 'atlas.search.form.titles.altitude',
        kind: 'numberRange',
        payloadKeys: ['altitude_min', 'altitude_max'],
    },
    {
        id: 'quadrant',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.quadrant',
        titleKey: 'atlas.search.form.titles.quadrant',
        placeholderKey: 'atlas.search.form.placeholders.quadrant',
        kind: 'text',
        payloadKeys: ['quadrant'],
    },
    {
        id: 'noMapSquare',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.noMapSquare',
        titleKey: 'atlas.search.form.titles.noMapSquare',
        kind: 'checkbox',
        payloadKeys: ['no_map_square_or_quadrant'],
    },
    {
        id: 'buffer',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.buffer',
        titleKey: 'atlas.search.form.titles.buffer',
        placeholderKey: 'atlas.search.form.placeholders.buffer',
        kind: 'number',
        payloadKeys: ['buffer'],
    },
    {
        id: 'polygon',
        category: 'locality',
        labelKey: 'atlas.advancedSearch.filters.polygon',
        kind: 'polygonMap',
        payloadKeys: ['polygonWkt'],
    },
    {
        id: 'phytochorion',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.phytochorion',
        titleKey: 'atlas.search.form.titles.phytochorion',
        kind: 'typeahead',
        scope: 'vascular',
        typeahead: {source: 'phytochorions'},
        payloadKeys: ['phytochorion'],
    },
    {
        id: 'comment',
        category: 'remarks',
        labelKey: 'atlas.search.form.labels.comment',
        titleKey: 'atlas.search.form.titles.comment',
        kind: 'text',
        payloadKeys: ['comment'],
    },
    {
        id: 'appComment',
        category: 'remarks',
        labelKey: 'atlas.advancedSearch.filters.appComment',
        placeholderKey: 'atlas.search.form.placeholders.appComment',
        kind: 'text',
        payloadKeys: ['pladias_comment'],
    },
    {
        id: 'finderSurname',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.finderSurname',
        titleKey: 'atlas.search.form.titles.finderSurname',
        placeholderKey: 'atlas.search.form.placeholders.finderSurname',
        kind: 'text',
        payloadKeys: ['finderSurname'],
    },
    {
        id: 'finderName',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.finderName',
        titleKey: 'atlas.search.form.titles.finderName',
        placeholderKey: 'atlas.search.form.placeholders.finderName',
        kind: 'text',
        payloadKeys: ['finderName'],
    },
    {
        id: 'year',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.year',
        titleKey: 'atlas.search.form.titles.year',
        kind: 'numberRange',
        defaultVisible: true,
        payloadKeys: ['minYear', 'maxYear'],
    },

    // pravý sloupec starého formuláře
    {
        id: 'source',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.source',
        titleKey: 'atlas.search.form.titles.source',
        kind: 'text',
        payloadKeys: ['source'],
    },
    {
        id: 'herbarium',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.herbarium',
        titleKey: 'atlas.search.form.titles.herbarium',
        kind: 'typeahead',
        scope: 'vascular',
        typeahead: {source: 'herbariums'},
        payloadKeys: ['herbarium'],
    },
    {
        id: 'herbariumText',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.herbarium',
        titleKey: 'atlas.search.form.titles.herbarium',
        placeholderKey: 'atlas.search.form.placeholders.herbariumText',
        kind: 'text',
        scope: 'nonVascular',
        payloadKeys: ['herbariumText'],
    },
    {
        id: 'institution',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.institution',
        titleKey: 'atlas.search.form.titles.institution',
        placeholderKey: 'atlas.search.form.placeholders.institution',
        kind: 'typeahead',
        typeahead: {source: 'institutions'},
        payloadKeys: ['institution'],
    },
    {
        id: 'projects',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.project',
        titleKey: 'atlas.search.form.titles.project',
        placeholderKey: 'atlas.search.form.placeholders.project',
        kind: 'typeahead',
        typeahead: {source: 'projects', multiple: true},
        payloadKeys: ['project[]'],
    },
    {
        id: 'committer',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.committer',
        kind: 'typeahead',
        typeahead: {source: 'committers'},
        payloadKeys: ['committerId'],
    },
    {
        id: 'validationStatus',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.validation',
        titleKey: 'atlas.search.form.titles.validation',
        kind: 'typeahead',
        typeahead: {source: 'validationStatus'},
        payloadKeys: ['validationStatus'],
    },
    {
        id: 'historyFlag',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.history',
        titleKey: 'atlas.search.form.titles.history',
        kind: 'typeahead',
        typeahead: {source: 'historyFlags'},
        payloadKeys: ['historyFlag'],
    },
    {
        id: 'importDate',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.importDate',
        kind: 'dateRange',
        payloadKeys: ['dateFromImported', 'dateToImported'],
    },
    {
        id: 'lastEditDate',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.lastEditDate',
        kind: 'dateRange',
        payloadKeys: ['dateFromLastEdit', 'dateToLastEdit'],
    },
    {
        id: 'license',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.license',
        titleKey: 'atlas.search.form.titles.license',
        placeholderKey: 'atlas.search.form.placeholders.license',
        kind: 'typeahead',
        typeahead: {source: 'licenses'},
        payloadKeys: ['license'],
    },
    {
        id: 'externalId',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.externalId',
        titleKey: 'atlas.search.form.titles.externalId',
        placeholderKey: 'atlas.search.form.placeholders.externalId',
        kind: 'text',
        payloadKeys: ['foreignId'],
    },
    {
        id: 'pladiasId',
        category: 'origin',
        labelKey: 'atlas.search.form.labels.pladiasId',
        kind: 'textarea',
        idList: true,
        payloadKeys: ['pladiasId'],
    },
    {
        id: 'commentStatus',
        category: 'remarks',
        labelKey: 'atlas.advancedSearch.filters.commentStatus',
        kind: 'checkboxGroup',
        checkboxes: [
            {id: 'commented', labelKey: 'atlas.advancedSearch.filters.commented'},
            {id: 'unresolvedComment', labelKey: 'atlas.advancedSearch.filters.unresolvedComment'},
        ],
        payloadKeys: ['commented', 'unresolvedComment'],
    },

    // jen non-vascular instance
    {
        id: 'substrateText',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.substrateText',
        titleKey: 'atlas.search.form.titles.substrateText',
        placeholderKey: 'atlas.search.form.placeholders.substrateText',
        kind: 'text',
        scope: 'nonVascular',
        payloadKeys: ['substrateText'],
    },
    {
        id: 'substrate1',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.substrate1',
        titleKey: 'atlas.search.form.titles.substrate1',
        placeholderKey: 'atlas.search.form.placeholders.substrate1',
        kind: 'text',
        scope: 'nonVascular',
        payloadKeys: ['substrate1'],
    },
    {
        id: 'substrate2',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.substrate2',
        titleKey: 'atlas.search.form.titles.substrate2',
        placeholderKey: 'atlas.search.form.placeholders.substrate2',
        kind: 'text',
        scope: 'nonVascular',
        payloadKeys: ['substrate2'],
    },
    {
        id: 'chemicalData',
        category: 'locality',
        labelKey: 'atlas.search.form.labels.chemicalData',
        titleKey: 'atlas.search.form.titles.chemicalData',
        placeholderKey: 'atlas.search.form.placeholders.chemicalData',
        kind: 'text',
        scope: 'nonVascular',
        payloadKeys: ['chemicalData'],
    },
];

/** Defaultně viditelné filtry – taxon name, rok nálezu („datum from"), lokalita. */
export const DEFAULT_VISIBLE_FILTERS: readonly FilterId[] = ['taxonName', 'year', 'localityDescription'];

/** Kategorie v pořadí zobrazení ve sloupcích „+" dropdownu. */
export const FILTER_CATEGORIES: readonly {category: FilterCategory; labelKey: string}[] = [
    {category: 'taxon', labelKey: 'atlas.advancedSearch.filterRow.categories.taxon'},
    {category: 'locality', labelKey: 'atlas.advancedSearch.filterRow.categories.locality'},
    {category: 'origin', labelKey: 'atlas.advancedSearch.filterRow.categories.origin'},
    {category: 'remarks', labelKey: 'atlas.advancedSearch.filterRow.categories.remarks'},
];

/** Index pořadí kategorií – pro řazení filtrů. */
const CATEGORY_ORDER: ReadonlyMap<FilterCategory, number> = new Map(
    FILTER_CATEGORIES.map(({category}, index) => [category, index]),
);

/**
 * Řazení filtrů podle pořadí kategorií (jako ve „+" popoveru). Sort je
 * stabilní – uvnitř kategorie zachovává pořadí registru, chipy tak mají
 * stejné pořadí inter i intra skupinové jako přepínač filtrů.
 */
export function compareFiltersByCategory(a: FilterDefinition, b: FilterDefinition): number {
    return (CATEGORY_ORDER.get(a.category) ?? 0) - (CATEGORY_ORDER.get(b.category) ?? 0);
}

/** Výchozí hodnoty filtrů (inicializace i reset) – parita se starým formulářem: podtaxony zapnuté. */
export function defaultFilterValues(): FilterValues {
    return {includeSubtaxa: true};
}

/** Platí filtr pro typ instance (vascular / nonVascular)? */
export function filterAppliesToInstance(filter: FilterDefinition, isVascular: boolean): boolean {
    if (!filter.scope) {
        return true;
    }
    return filter.scope === (isVascular ? 'vascular' : 'nonVascular');
}

/** Doprovodný filtr rodiče (podtaxony u taxonu), pokud existuje. */
export function getCompanionFilter(parentId: FilterId): FilterDefinition | undefined {
    return FILTER_DEFINITIONS.find((filter) => filter.companionOf === parentId);
}

/**
 * Prázdná hodnota = nemá smysl ji držet ani posílat (text, seznam, rozsah).
 * Boolean se drží vždy – false je informace (odškrtnutí podtaxonů).
 */
export function isEmptyFilterValue(value: FilterValue | undefined): boolean {
    if (value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    if (typeof value === 'boolean') {
        return false;
    }
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    return value.from.trim() === '' && value.to.trim() === '';
}

/**
 * Checkbox zaškrtnutý? includeSubtaxa má výchozí true (parita se starým
 * formulářem) – nevyplněná hodnota se chápe jako zaškrtnutá.
 */
export function isCheckboxChecked(filter: FilterDefinition, value: FilterValue | undefined): boolean {
    return filter.id === 'includeSubtaxa' ? value !== false : value === true;
}

/** Textová reprezentace hodnoty pro chip (null = filtr nevyplněn). */
export function formatFilterValue(filter: FilterDefinition, value: FilterValue | undefined): string | null {
    if (value === undefined) {
        return null;
    }
    if (filter.kind === 'checkbox') {
        return isCheckboxChecked(filter, value) ? '✓' : null;
    }
    if (filter.kind === 'polygonMap') {
        // nakreslený polygon – na chipu jen značka, tvar je vidět na mapě v popoveru
        return '✓';
    }
    if (isEmptyFilterValue(value)) {
        return null;
    }
    if (Array.isArray(value)) {
        return value.map((option) => option.label).join(', ');
    }
    if (filter.kind === 'numberRange' || filter.kind === 'dateRange') {
        const range = value as RangeValue;
        const separator = filter.kind === 'dateRange' ? ' – ' : '–';
        if (range.from && range.to) {
            return `${range.from}${separator}${range.to}`;
        }
        return range.from || range.to;
    }
    return String(value);
}

/**
 * Sdílené typy pokročilého vyhledávání (atlas/search/advanced).
 */

import type {TypeaheadOption} from '../types';

/** Druh vstupu filtru – určuje vykreslení ve FilterEditoru a tvar hodnoty. */
export type FilterKind =
    | 'text'
    | 'number'
    | 'numberRange'
    | 'dateRange'
    | 'checkbox'
    | 'checkboxGroup'
    | 'textarea'
    | 'typeahead'
    | 'taxonAutocomplete'
    | 'polygonMap';

/** Kategorie filtru – seskupení do sloupců „+" dropdownu. */
export type FilterCategory = 'locality' | 'origin' | 'taxon' | 'remarks';

/** Identifikátory všech filtrů – výčet drží filterRegistry (FilterId ↔ definice 1:1). */
export type FilterId =
    | 'taxonName'
    | 'includeSubtaxa'
    | 'originalName'
    | 'town'
    | 'localityDescription'
    | 'localityOrTown'
    | 'localityExtra'
    | 'altitude'
    | 'quadrant'
    | 'polygon'
    | 'noMapSquare'
    | 'buffer'
    | 'phytochorion'
    | 'comment'
    | 'appComment'
    | 'finderSurname'
    | 'finderName'
    | 'year'
    | 'source'
    | 'herbarium'
    | 'herbariumText'
    | 'institution'
    | 'projects'
    | 'committer'
    | 'validationStatus'
    | 'historyFlag'
    | 'importDate'
    | 'lastEditDate'
    | 'license'
    | 'externalId'
    | 'pladiasId'
    | 'commentStatus'
    | 'substrateText'
    | 'substrate1'
    | 'substrate2'
    | 'chemicalData';

/** Hodnota rozsahového filtru (od–do); vyplněná může být i jen jedna strana. */
export interface RangeValue {
    from: string;
    to: string;
}

/** Union hodnot všech druhů filtrů. */
export type FilterValue = string | boolean | RangeValue | TypeaheadOption[];

/** Stav hodnot filtrů – jen vyplněné (prázdné se při zápisu do store mažou). */
export type FilterValues = Partial<Record<FilterId, FilterValue>>;

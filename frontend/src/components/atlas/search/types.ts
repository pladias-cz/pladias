/**
 * Sdílené typy vyhledávacího formuláře (atlas/search).
 */

/** Položka selectu/typeaheadu filtru (id jde do hidden inputu submitu). */
export type TypeaheadOption = {
    id: string | number;
    label: string;
};

/** Položka sort selectu výsledků. */
export type SortOption = {
    value: string;
    label: string;
};

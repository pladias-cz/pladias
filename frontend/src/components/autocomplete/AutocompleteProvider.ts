export interface AutocompleteProvider<T> {
    /** vyhledání + mapování JSON → doménový typ; `signal` ruší zastaralá typeahead hledání */
    search(query: string, signal?: AbortSignal): Promise<T[]>;

    /** jak se položka zobrazí */
    label(item: T): string;

    /** UI konfigurace */
    placeholder: string;
    minLength?: number;
}

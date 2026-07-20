export interface AutocompleteProvider<T> {
    /** vyhledání + mapování JSON → doménový typ */
    search(query: string): Promise<T[]>;

    /** jak se položka zobrazí */
    label(item: T): string;

    /** UI konfigurace */
    placeholder: string;
    minLength?: number;
}

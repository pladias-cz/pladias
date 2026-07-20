import type {AutocompleteProvider} from './AutocompleteProvider';
import type {TaxonId} from '@/models/TaxonId';

export function createTaxaImportableProvider(placeholder: string): AutocompleteProvider<TaxonId> {
    return {
        placeholder,
        minLength: 2,

        async search(query: string): Promise<TaxonId[]> {
            if (query.length < this.minLength!) {
                return [];
            }

            const res = await fetch(`/api/react/taxa/importable?prefix=${encodeURIComponent(query)}`);
            const result = await res.json();
            return result.data || [];
        },

        label(item: TaxonId): string {
            return item.nameLat;
        },
    };
}

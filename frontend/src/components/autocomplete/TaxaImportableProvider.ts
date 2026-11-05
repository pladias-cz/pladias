import type {AutocompleteProvider} from './AutocompleteProvider';
import {searchImportableTaxa} from '@/services/taxonApi';
import type {TaxonId} from '@/models/TaxonId';

export function createTaxaImportableProvider(placeholder: string): AutocompleteProvider<TaxonId> {
    return {
        placeholder,
        minLength: 2,

        async search(query, signal): Promise<TaxonId[]> {
            return searchImportableTaxa(query, signal);
        },

        label(item: TaxonId): string {
            return item.nameLat;
        },
    };
}

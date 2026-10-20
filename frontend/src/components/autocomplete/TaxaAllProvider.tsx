import type { AutocompleteProvider } from '@/components/autocomplete/AutocompleteProvider';
import {searchTaxaByPrefix} from '@/services/taxonApi';
import type { TaxonId } from '@/models/TaxonId';

export function createTaxaAllProvider(placeholder: string): AutocompleteProvider<TaxonId> {
    return {
        placeholder,
        minLength: 2,

        label(taxon) {
            return taxon.nameLat;
        },

        async search(query, signal) {
            return searchTaxaByPrefix(query, signal);
        },
    };
}


import type { AutocompleteProvider } from '@/components/autocomplete/AutocompleteProvider';
import type { TaxonId } from '@/models/TaxonId';

export function createTaxaAllProvider(placeholder: string): AutocompleteProvider<TaxonId> {
    return {
        placeholder,
        minLength: 2,

        label(taxon) {
            return taxon.nameLat;
        },

        async search(query) {
            const res = await fetch(
                `/api/react/taxa/queryAll?prefix=${encodeURIComponent(query)}`
            );
            const json = await res.json();

            return (json.data ?? []).map((t: any): TaxonId => ({
                id: t.id,
                nameLat: t.nameLat,
                nameHtml: t.nameHtml
            }));
        },
    };
}


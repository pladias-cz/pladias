import type { AutocompleteProvider } from '@/components/autocomplete/AutocompleteProvider';
import type { TaxonId } from '@/models/TaxonId';
import { Autocomplete } from '@/components/autocomplete/Autocomplete';
import {searchPossibleTaxonParents} from '@/services/taxonApi';
import { useTranslation } from 'react-i18next';

interface Props {
    taxonId: number;
    onSelect: (parent: TaxonId | null) => void;
}
function createPossibleParentsProvider(
    taxonId: number,
    placeholder: string
): AutocompleteProvider<TaxonId> {
    return {
        placeholder,
        minLength: 2,

        label(taxon) {
            return taxon.nameLat;
        },

        async search(query: string, signal?: AbortSignal) {
            return searchPossibleTaxonParents(taxonId, query, signal);
        },
    };
}

export default function TaxaPossibleParentAutocomplete({
    taxonId,
    onSelect,
}: Props) {
    const { t } = useTranslation();
    const provider = createPossibleParentsProvider(taxonId, t("common.autocomplete.possibleParentsPlaceholder"));

    return (
        <Autocomplete<TaxonId>
            provider={provider}
            cacheKey={taxonId}
            onSelect={onSelect}
        />
    );
}

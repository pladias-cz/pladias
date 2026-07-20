import type { AutocompleteProvider } from '@/components/autocomplete/AutocompleteProvider';
import type { TaxonId } from '@/models/TaxonId';
import { Autocomplete } from '@/components/autocomplete/Autocomplete';
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

        async search(query: string) {
            const res = await fetch(
                `/api/react/taxon/${taxonId}/possibleParents?prefix=${encodeURIComponent(query)}`
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

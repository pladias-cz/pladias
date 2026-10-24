import {useState} from 'react';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {searchTaxaByPrefix} from '@/services/taxonApi';
import {isAbortError} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';
import type {TaxonId} from '@/models/TaxonId';

interface ParentMapAutocompleteProps {
    taxonId: number;
    onChange: (selected: TaxonId | null) => void;
    updatingTaxonId: number | null;
    placeholder: string;
}

export function ParentMapAutocomplete({
                                          taxonId,
                                          onChange,
                                          updatingTaxonId,
                                          placeholder
                                      }: ParentMapAutocompleteProps) {
    const {t} = useTranslation();
    const [query, setQuery] = useState('');
    // Inkrement po výběru položky – změní klíč dotazu, čímž se zahodí výsledky
    // předchozího hledání (dřív řešeno mazáním options v effectu).
    const [cacheKey, setCacheKey] = useState(0);

    // Hledání deklarativně (sekce J): dotaz klíčovaný zadaným textem. Čtení
    // `signal` v queryFn ruší zastaralá hledání – ruční verze je nechala doběhnout
    // a přepsala by novější výsledky.
    const {data, isFetching} = useQuery({
        queryKey: ['parentMapAutocomplete', taxonId, cacheKey, query],
        queryFn: async ({signal}) => {
            try {
                return await searchTaxaByPrefix(query, signal);
            } catch (err) {
                if (!isAbortError(err)) {
                    notifyApiError(err, t('common.autocomplete.searchFailed'));
                }
                throw err;
            }
        },
        enabled: query.length >= 2,
        placeholderData: (previous, previousQuery) =>
            // nabídka drží výsledky předchozího hledání, dokud nové nedoběhne;
            // po výběru (nový cacheKey) se zahodí
            previousQuery?.queryKey[1] === taxonId && previousQuery.queryKey[2] === cacheKey
                ? previous
                : undefined,
    });

    return (
        <AsyncTypeahead
            id={`parent-map-autocomplete-${taxonId}`}
            useCache={false}
            isLoading={isFetching}
            minLength={2}
            onSearch={setQuery}
            options={data ?? []}
            labelKey={(option) => (option as TaxonId).nameLat}
            onChange={(selected) => {
                onChange(selected[0] ? (selected[0] as TaxonId) : null);
                // zahodit výsledky hledání (nový klíč) a vypnout dotaz (prázdný text)
                setQuery('');
                setCacheKey(prev => prev + 1);
            }}
            placeholder={placeholder}
            renderMenuItemChildren={(option) => {
                const taxon = option as TaxonId;
                return (
                    <>
                        <strong>{taxon.nameLat}</strong>
                    </>
                );
            }}
            clearButton
            disabled={updatingTaxonId === taxonId}
            size="sm"
        />
    );
}

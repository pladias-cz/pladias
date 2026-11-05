import {useState} from 'react';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import type {AutocompleteProvider} from './AutocompleteProvider';
import type {Option} from 'react-bootstrap-typeahead/types/types';
import {isAbortError} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';

interface Props<T> {
    provider: AutocompleteProvider<T>;
    cacheKey: number;
    /** Vybrané položky (řízený stav volajícího – hodnota filtru). */
    selected: T[];
    onChange: (selections: T[]) => void;
}

/**
 * Vícenásobný autocomplete (vzor Autocomplete): výběr z nabídky přidá položku
 * do řízeného `selected`, vstup se vyčistí pro psaní dalšího; odstranění
 * položky (× u chipu / clearButton) vyvolá onChange bez ní. Hledání
 * deklarativně (sekce J): dotaz klíčovaný zadaným textem, `signal` ruší
 * zastaralá hledání i rozjetý dotaz po odmontování.
 */
export function AutocompleteMultiple<T extends Option>({provider, cacheKey, selected, onChange}: Props<T>) {
    const {t} = useTranslation();
    const [query, setQuery] = useState('');
    const minLength = provider.minLength ?? 2;

    const {data, isFetching} = useQuery({
        queryKey: ['autocomplete', provider.placeholder, cacheKey, query],
        queryFn: async ({signal}) => {
            try {
                return await provider.search(query, signal);
            } catch (err) {
                // přerušené hledání (novější text / unmount) není chyba
                if (!isAbortError(err)) {
                    notifyApiError(err, t('common.autocomplete.searchFailed'));
                }
                throw err;
            }
        },
        enabled: query.length >= minLength,
        placeholderData: (previous, previousQuery) => {
            // výsledky předchozího hledání zůstávají v nabídce, dokud nové
            // nedoběhne; po přepnutí kontextu (jiný cacheKey / provider)
            // se nabídka zahodí
            return previousQuery?.queryKey[1] === provider.placeholder
            && previousQuery.queryKey[2] === cacheKey
                ? previous
                : undefined;
        },
    });

    return (
        <AsyncTypeahead
            id="autocomplete-multiple"
            multiple
            useCache={false}
            isLoading={isFetching}
            minLength={minLength}
            onSearch={setQuery}
            options={data ?? []}
            labelKey={(option) => provider.label(option as T)}
            onChange={(selections) => onChange(selections as T[])}
            selected={selected}
            placeholder={provider.placeholder}
            clearButton
        />
    );
}
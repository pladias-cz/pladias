import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import type { AutocompleteProvider } from './AutocompleteProvider';
import type { Option } from 'react-bootstrap-typeahead/types/types';
import {isAbortError} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';


interface Props<T> {
    provider: AutocompleteProvider<T>;
    cacheKey: number;
    autoFocus?: boolean;
    clearOnSelect?: boolean;
    onSelect: (value: T | null) => void;
}

export function Autocomplete<T extends Option>({
    provider,
    cacheKey,
    autoFocus = false,
    clearOnSelect = true,
    onSelect,
}: Props<T>) {
    const {t} = useTranslation();
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<T[]>([]);
    const minLength = provider.minLength ?? 2;

    // Hledání deklarativně (sekce J): dotaz klíčovaný zadaným textem. Čtení
    // `signal` v queryFn zajišťuje zrušení zastaralých hledání i rozjetého
    // dotazu po odmontování (odhlášení posledního observeru abortuje fetch).
    const {data, isFetching} = useQuery({
        queryKey: ['autocomplete', provider.placeholder, cacheKey, query],
        queryFn: async ({signal}) => {
            try {
                return await provider.search(query, signal);
            } catch (err) {
                // přerušené hledání (novější text / unmount) není chyba
                if (!isAbortError(err)) {
                    notifyApiError(err, t("common.autocomplete.searchFailed"));
                }
                throw err;
            }
        },
        enabled: query.length >= minLength,
        placeholderData: (previous, previousQuery) => {
            // Výsledky předchozího hledání zůstávají v nabídce, dokud nové
            // nedoběhne (jako dřív); po přepnutí kontextu (jiný cacheKey /
            // provider) se nabídka zahodí.
            return previousQuery?.queryKey[1] === provider.placeholder
                && previousQuery.queryKey[2] === cacheKey
                ? previous
                : undefined;
        },
    });

    const handleChange = (selections: Option[]) => {
        const value = (selections[0] as T) ?? null;
        onSelect(value);
        if (value == null || clearOnSelect) {
            setSelected([]);
            return;
        }

        setSelected([value]);
    };

    return (
        <AsyncTypeahead
            id="autocomplete"
            useCache={false}
            isLoading={isFetching}
            minLength={minLength}
            onSearch={setQuery}
            options={data ?? []}
            labelKey={(o) => provider.label(o as T)}
            onChange={handleChange}
            selected={selected}
            placeholder={provider.placeholder}
            autoFocus={autoFocus}
            clearButton
        />
    );
}

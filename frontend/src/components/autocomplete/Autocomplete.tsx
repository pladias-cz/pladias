import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import {useEffect, useRef, useState} from 'react';
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
    const [options, setOptions] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selected, setSelected] = useState<T[]>([]);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setOptions([]);
    }, [cacheKey, provider]);

    // zruší hledání, které běží v okamžiku odmontování komponenty
    useEffect(() => () => abortRef.current?.abort(), []);

    const handleSearch = async (query: string) => {
        if (query.length < (provider.minLength ?? 2)) return;

        // typeahead: nové hledání ruší předchozí – pomalé zastaralé odpovědi
        // nesmí přepsat výsledky novějšího dotazu (závodí při pomalém API)
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        try {
            setOptions(await provider.search(query, controller.signal));
        } catch (err) {
            if (!isAbortError(err)) {
                notifyApiError(err, t("common.autocomplete.searchFailed"));
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
            }
        }
    };

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
            isLoading={isLoading}
            minLength={provider.minLength ?? 2}
            onSearch={handleSearch}
            options={options}
            labelKey={(o) => provider.label(o as T)}
            onChange={handleChange}
            selected={selected}
            placeholder={provider.placeholder}
            autoFocus={autoFocus}
            clearButton
        />
    );
}

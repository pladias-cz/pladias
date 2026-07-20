import { AsyncTypeahead } from 'react-bootstrap-typeahead';
import { useEffect, useState } from 'react';
import type { AutocompleteProvider } from './AutocompleteProvider';
import type { Option } from 'react-bootstrap-typeahead/types/types';


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
    const [options, setOptions] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selected, setSelected] = useState<T[]>([]);

    useEffect(() => {
        setOptions([]);
    }, [cacheKey, provider]);

    const handleSearch = async (query: string) => {
        if (query.length < (provider.minLength ?? 2)) return;

        setIsLoading(true);
        setOptions(await provider.search(query));
        setIsLoading(false);
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

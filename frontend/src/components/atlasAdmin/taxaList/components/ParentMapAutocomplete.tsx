import {useEffect, useState} from 'react';
import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import type {TaxonOption} from '../types';

interface ParentMapAutocompleteProps {
    taxonId: number;
    onChange: (selected: TaxonOption | null) => void;
    updatingTaxonId: number | null;
    placeholder: string;
}

export function ParentMapAutocomplete({
    taxonId,
    onChange,
    updatingTaxonId,
    placeholder
}: ParentMapAutocompleteProps) {
    const [options, setOptions] = useState<TaxonOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [cacheKey, setCacheKey] = useState(0);

    useEffect(() => {
        setOptions([]);
    }, [cacheKey]);

    const handleSearch = async (query: string) => {
        if (query.length < 2) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/react/taxa/queryAll?prefix=${encodeURIComponent(query)}`);
            const result = await res.json();
            setOptions(result.data || []);
        } catch (error) {
            console.error('Error loading taxa options:', error);
            setOptions([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AsyncTypeahead
            id={`parent-map-autocomplete-${taxonId}`}
            useCache={false}
            isLoading={isLoading}
            minLength={2}
            onSearch={handleSearch}
            options={options}
            labelKey={(option) => (option as TaxonOption).nameLat}
            onChange={(selected) => {
                onChange(selected[0] ? (selected[0] as TaxonOption) : null);
                setCacheKey(prev => prev + 1);
            }}
            placeholder={placeholder}
            renderMenuItemChildren={(option) => {
                const taxon = option as TaxonOption;
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

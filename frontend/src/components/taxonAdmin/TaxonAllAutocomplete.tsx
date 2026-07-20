import {AsyncTypeahead} from 'react-bootstrap-typeahead';
import {useEffect, useState} from 'react';
import {type TaxonId} from '@/models/TaxonId';
import {useTranslation} from 'react-i18next';

interface Props {
    onSelect: (taxonId: TaxonId | null) => void;
    cacheKey: number;
    autoFocus?: boolean;

}
export default function TaxonAllAutocomplete({onSelect, cacheKey, autoFocus = false}: Props) {
    const {t} = useTranslation();
    const [options, setOptions] = useState<TaxonId[]>([]);
    const [isLoading, setIsLoading] = useState(false);


    useEffect(() => {
        setOptions([]);
    }, [cacheKey]);

    const handleSearch = async (query: string) => {
        if (query.length < 2) return;

        setIsLoading(true);
        const res = await fetch(`/api/react/taxa/queryAll?prefix=${encodeURIComponent(query)}`);
        // const result = await res.json();
        // setOptions(result.data || []);
        const result = await res.json();
        setOptions(result.data || []);
        setIsLoading(false);
    };

    return (
        <AsyncTypeahead
            id="taxon-autocomplete"
            autoFocus={autoFocus}
            useCache={false}
            isLoading={isLoading}
            minLength={2}
            onSearch={handleSearch}
            options={options}
            labelKey={(option) => (option as TaxonId).nameLat}
            onChange={(selected) => onSelect(selected[0] ? selected[0] as TaxonId : null)}
            placeholder={t("common.autocomplete.taxonPlaceholder")}
            renderMenuItemChildren={(option) => {
                const taxonId = option as TaxonId;
                return (
                    <>
                        <strong>{taxonId.nameLat}</strong>
                    </>
                );
            }}
            clearButton
        />
    );
}

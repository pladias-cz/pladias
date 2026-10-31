/**
 * Vstupní pole jednoho filtru uvnitř popoveru chipu – vykreslení podle kind
 * z registru. Hodnota je kontrolovaná (store); typeaheady dostávají číselník
 * od rodiče (optionsBySource), taxon autocomplete vlastního providera.
 */

import {useTranslation} from 'react-i18next';
import {Form} from 'react-bootstrap';
import {Typeahead} from 'react-bootstrap-typeahead';
import {Autocomplete} from '@/components/autocomplete/Autocomplete';
import type {AutocompleteProvider} from '@/components/autocomplete/AutocompleteProvider';
import type {TaxonId} from '@/models/TaxonId';
import {isCheckboxChecked, type FilterDefinition} from './filterRegistry';
import type {FilterValue, RangeValue} from './types';
import type {TypeaheadOption} from '../types';

interface FilterEditorProps {
    filter: FilterDefinition;
    value: FilterValue | undefined;
    onChange: (value: FilterValue) => void;
    /** Číselník pro typeahead filtr. */
    options?: TypeaheadOption[];
    /** Provider pro taxon autocomplete (jen taxonName). */
    taxonProvider?: AutocompleteProvider<TaxonId>;
    /** Doprovodný filtr (podtaxony u taxonu) – checkbox pod vstupem. */
    companion?: FilterDefinition;
    companionValue?: FilterValue;
    onCompanionChange?: (value: FilterValue) => void;
}

export function FilterEditor({
                                 filter,
                                 value,
                                 onChange,
                                 options,
                                 taxonProvider,
                                 companion,
                                 companionValue,
                                 onCompanionChange,
                             }: FilterEditorProps) {
    const {t} = useTranslation();

    const placeholder = t((filter.placeholderKey ?? filter.labelKey) as never);

    const setRange = (range: Partial<RangeValue>) => {
        const current: RangeValue = (typeof value === 'object' && value !== null && !Array.isArray(value))
            ? value
            : {from: '', to: ''};
        onChange({...current, ...range});
    };

    const rangeFrom = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value.from : '';
    const rangeTo = (typeof value === 'object' && value !== null && !Array.isArray(value)) ? value.to : '';

    return (
        <div className="filter-editor">
            {filter.kind === 'taxonAutocomplete' && taxonProvider && (
                <Autocomplete<TaxonId>
                    provider={taxonProvider}
                    cacheKey={0}
                    clearOnSelect={false}
                    onSelect={(taxon) => onChange(taxon?.nameLat ?? '')}
                />
            )}

            {filter.kind === 'typeahead' && (
                <Typeahead
                    id={`filter-${filter.id}`}
                    labelKey="label"
                    multiple={filter.typeahead?.multiple ?? false}
                    options={options ?? []}
                    placeholder={placeholder}
                    selected={Array.isArray(value) ? value : []}
                    onChange={(selected) => onChange(selected as TypeaheadOption[])}
                    clearButton
                />
            )}

            {(filter.kind === 'text' || filter.kind === 'number') && (
                <Form.Control
                    size="sm"
                    type={filter.kind === 'number' ? 'number' : 'text'}
                    placeholder={placeholder}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}

            {filter.kind === 'textarea' && (
                <Form.Control
                    size="sm"
                    as="textarea"
                    rows={4}
                    placeholder={placeholder}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}

            {(filter.kind === 'numberRange' || filter.kind === 'dateRange') && (
                <div className="d-flex align-items-center gap-2">
                    <Form.Control
                        size="sm"
                        type={filter.kind === 'dateRange' ? 'date' : 'number'}
                        aria-label={t('atlas.search.form.from')}
                        placeholder={t('atlas.search.form.from')}
                        value={rangeFrom}
                        onChange={(event) => setRange({from: event.target.value})}
                    />
                    <span aria-hidden="true">–</span>
                    <Form.Control
                        size="sm"
                        type={filter.kind === 'dateRange' ? 'date' : 'number'}
                        aria-label={t('atlas.search.form.to')}
                        placeholder={t('atlas.search.form.to')}
                        value={rangeTo}
                        onChange={(event) => setRange({to: event.target.value})}
                    />
                </div>
            )}

            {filter.kind === 'checkbox' && (
                <Form.Check
                    type="checkbox"
                    id={`filter-${filter.id}`}
                    label={t(filter.labelKey as never)}
                    checked={isCheckboxChecked(filter, value)}
                    onChange={(event) => onChange(event.target.checked)}
                />
            )}

            {companion && filter.kind === 'taxonAutocomplete' && onCompanionChange && (
                <Form.Check
                    className="mt-2"
                    type="checkbox"
                    id={`filter-${companion.id}`}
                    label={t(companion.labelKey as never)}
                    checked={isCheckboxChecked(companion, companionValue)}
                    onChange={(event) => onCompanionChange(event.target.checked)}
                />
            )}
        </div>
    );
}

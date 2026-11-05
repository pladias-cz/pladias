/**
 * Vstupní pole jednoho filtru uvnitř popoveru chipu – vykreslení podle kind
 * z registru. Hodnota je kontrolovaná (store); typeaheady dostávají číselník
 * od rodiče (optionsBySource), taxon autocomplete vlastního providera.
 * Výběr z autocomplete / typeahead i přepnutí checkboxu potvrzuje hodnotu
 * (onCommit – spouštěč vyhledávání bez zavření popoveru); Enter v textovém
 * vstupu filtr odesílá (onEnter – zavře popover chipu, což vyhledávání spustí).
 */

import type {KeyboardEvent} from 'react';
import {useTranslation} from 'react-i18next';
import {Form} from 'react-bootstrap';
import {Typeahead} from 'react-bootstrap-typeahead';
import type {AutocompleteProvider} from '@/components/autocomplete/AutocompleteProvider';
import {AutocompleteMultiple} from '@/components/autocomplete/AutocompleteMultiple';
import type {TaxonId} from '@/models/TaxonId';
import {isCheckboxChecked, type CheckboxOption, type FilterDefinition} from './filterRegistry';
import {PolygonMapEditor} from './PolygonMapEditor';
import type {FilterValue, RangeValue} from './types';
import type {TypeaheadOption} from '../types';

/**
 * Seznam id (pladiasId, flag idList v registru): jakákoli sekvence znaků
 * jiných než číslice – mezera, čárka, konec řádku, písmeno i vícenásobný
 * středník – se sloučí na jediný středník, takže vložený seznam funguje
 * s libovolným oddělovačem (backend splituje [;\r\n]+ a necelé tokeny
 * zahazuje, čárka by bez normalizace hodnotu tiše rozbila).
 */
function normalizeIdList(raw: string): string {
    return raw.replace(/\D+/g, ';');
}

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
    /** Potvrzení hodnoty výběrem (autocomplete / typeahead, přepnutí checkboxu) – spouštěč vyhledávání, popover zůstává otevřený. */
    onCommit?: () => void;
    /** Enter v textovém vstupu – potvrzení filtru (zavře popover chipu → spustí vyhledávání). */
    onEnter?: () => void;
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
                                 onCommit,
                                 onEnter,
                             }: FilterEditorProps) {
    const {t} = useTranslation();

    const placeholder = t((filter.placeholderKey ?? filter.labelKey) as never);

    /** Enter v textovém vstupu potvrzuje filtr – uživatelé ho očekávají jako odeslání. */
    const handleEnterKey = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            onEnter?.();
        }
    };

    /** Vstup textového filtru – idList (pladiasId) normalizuje na středníky oddělená čísla. */
    const handleTextChange = (raw: string) => {
        onChange(filter.idList === true ? normalizeIdList(raw) : raw);
    };

    /** Vybrané volby skupiny checkboxů (stav komenářů). */
    const checkboxGroupSelected = Array.isArray(value) ? value : [];

    /** Vybrané taxony (hodnota filtru) mapované na TaxonId pro labelKey multiple typeaheadu. */
    const taxonSelected = (Array.isArray(value) ? value : [])
        .map((option) => ({id: Number(option.id), nameLat: option.label, nameHtml: ''}));

    /** Přepnutí volby skupiny – pořadí vybraných podle registru (stabilní chip i payload). */
    const toggleCheckboxGroup = (checkbox: CheckboxOption, checked: boolean) => {
        const ids = new Set(checkboxGroupSelected.map((option) => option.id));
        if (checked) {
            ids.add(checkbox.id);
        } else {
            ids.delete(checkbox.id);
        }
        onChange((filter.checkboxes ?? [])
            .filter((option) => ids.has(option.id))
            .map((option) => ({id: option.id, label: t(option.labelKey as never)})));
    };

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
                <AutocompleteMultiple<TaxonId>
                    provider={taxonProvider}
                    cacheKey={0}
                    selected={taxonSelected}
                    onChange={(taxa) => {
                        onChange(taxa.map((taxon) => ({id: taxon.id, label: taxon.nameLat})));
                        // (de)selekce z nabídky = potvrzená hodnota → hledat hned
                        onCommit?.();
                    }}
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
                    onChange={(selected) => {
                        onChange(selected as TypeaheadOption[]);
                        // (de)selekce z nabídky = potvrzená hodnota → hledat hned
                        onCommit?.();
                    }}
                    clearButton
                />
            )}

            {(filter.kind === 'text' || filter.kind === 'number') && (
                <Form.Control
                    size="sm"
                    type={filter.kind === 'number' ? 'number' : 'text'}
                    placeholder={placeholder}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => handleTextChange(event.target.value)}
                    onKeyDown={handleEnterKey}
                />
            )}

            {filter.kind === 'textarea' && (
                <Form.Control
                    size="sm"
                    as="textarea"
                    rows={4}
                    placeholder={placeholder}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => handleTextChange(event.target.value)}
                    onKeyDown={handleEnterKey}
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
                        onKeyDown={handleEnterKey}
                    />
                    <span aria-hidden="true">–</span>
                    <Form.Control
                        size="sm"
                        type={filter.kind === 'dateRange' ? 'date' : 'number'}
                        aria-label={t('atlas.search.form.to')}
                        placeholder={t('atlas.search.form.to')}
                        value={rangeTo}
                        onChange={(event) => setRange({to: event.target.value})}
                        onKeyDown={handleEnterKey}
                    />
                </div>
            )}

            {filter.kind === 'polygonMap' && (
                <PolygonMapEditor
                    value={typeof value === 'string' ? value : ''}
                    onChange={onChange}
                    onCommit={onCommit}
                />
            )}

            {filter.kind === 'checkbox' && (
                <Form.Check
                    type="checkbox"
                    id={`filter-${filter.id}`}
                    label={t(filter.labelKey as never)}
                    checked={isCheckboxChecked(filter, value)}
                    onChange={(event) => {
                        onChange(event.target.checked);
                        // přepnutí checkboxu = potvrzená volba → hledat hned
                        onCommit?.();
                    }}
                />
            )}

            {filter.kind === 'checkboxGroup' && (filter.checkboxes ?? []).map((checkbox) => (
                <Form.Check
                    key={checkbox.id}
                    type="checkbox"
                    id={`filter-${filter.id}-${checkbox.id}`}
                    label={t(checkbox.labelKey as never)}
                    checked={checkboxGroupSelected.some((option) => option.id === checkbox.id)}
                    onChange={(event) => {
                        toggleCheckboxGroup(checkbox, event.target.checked);
                        // přepnutí checkboxu = potvrzená volba → hledat hned
                        onCommit?.();
                    }}
                />
            ))}

            {companion && filter.kind === 'taxonAutocomplete' && onCompanionChange && (
                <Form.Check
                    className="mt-2"
                    type="checkbox"
                    id={`filter-${companion.id}`}
                    label={t(companion.labelKey as never)}
                    checked={isCheckboxChecked(companion, companionValue)}
                    onChange={(event) => {
                        onCompanionChange(event.target.checked);
                        // přepnutí checkboxu = potvrzená volba → hledat hned
                        onCommit?.();
                    }}
                />
            )}
        </div>
    );
}

/**
 * Ovládací prvky filtrovacího řádku (text / select / typeahead nad přednačtenými
 * názvy) pro tabulky, které si stav filtrů drží samy a potřebují jen jednotlivé
 * prvky vedle vlastních `<th>` – renderují se uvnitř `<th>` nebo `<td>`
 * (PladiasRecordsTable, ExternalRecordsTable). `DataTableFilterRow` nad
 * `DataTableConfig` je nadstavená varianta pro tabulky s endpointem.
 *
 * `emptyValue` je hodnota, která značí „bez filtru“ (u selectu první option);
 * typeahead filtruje jako wildcard (viditelné jsou i částečné hodnoty), seznam
 * pod inputem je jen usnadnění výběru.
 */

import {useState} from 'react';
import type {ChangeEventHandler, KeyboardEvent} from 'react';
import {Form} from 'react-bootstrap';

export type FilterControl = 'text' | 'select' | 'typeahead';

interface FilterOption {
    value: string;
    label: string;
}

interface DataTableFilterCellProps {
    control: FilterControl;
    value: string;
    onChange: (value: string) => void;
    /** Hodnota, která značí „bez filtru“ (u selectu povinná). */
    emptyValue?: string;
    placeholder?: string;
    title?: string;
    /** Options pro select i typeahead (názvy projektů, fytogeografická území). */
    options?: FilterOption[];
    /** Maximální počet nápověd typeaheadu pod inputem. */
    maxSuggestions?: number;
}

const INPUT_STYLE = {width: '100%', boxSizing: 'border-box'} as const;

export function DataTableFilterCell(props: DataTableFilterCellProps) {
    const {
        control,
        value,
        onChange,
        emptyValue = '',
        placeholder,
        title,
        options = [],
        maxSuggestions = 8,
    } = props;

    if (control === 'select') {
        const handleChange: ChangeEventHandler<HTMLSelectElement> = event => onChange(event.target.value);
        return (
            <Form.Select
                size="sm"
                value={value}
                onChange={handleChange}
                title={title}
                style={INPUT_STYLE}
            >
                <option value={emptyValue}>{placeholder}</option>
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </Form.Select>
        );
    }

    return <TypeaheadFilter {...props} maxSuggestions={maxSuggestions}/>;
}

/**
 * Textový filtr s nápovědou přednačtených názvů: filtruje jako wildcard (viditelné
 * jsou i částečné hodnoty), seznam pod inputem je jen usnadnění výběru.
 */
function TypeaheadFilter(props: DataTableFilterCellProps) {
    const {value, onChange, placeholder, title, options = [], maxSuggestions = 8, control} = props;
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Enter bez výběru z nápovědy: aplikuje aktuální text filtru (tabulka se nefiltruje
    // submitem formuláře, na rozdíl od typeaheadů vyhledávacího formuláře)
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }
        event.preventDefault();
        setShowSuggestions(false);
        onChange(event.currentTarget.value);
    };

    if (control === 'text') {
        const handleChange: ChangeEventHandler<HTMLInputElement> = event => onChange(event.target.value);
        return (
            <Form.Control
                size="sm"
                type="text"
                placeholder={placeholder}
                title={title}
                value={value}
                onChange={handleChange}
                style={INPUT_STYLE}
            />
        );
    }

    const query = value.trim().toLowerCase();
    const matches = query === ''
        ? options
        : options.filter(option => option.label.toLowerCase().includes(query));
    const suggestions = matches.slice(0, maxSuggestions);
    const exactMatch = options.some(option => option.label.toLowerCase() === query);

    return (
        <div className="position-relative">
            <Form.Control
                size="sm"
                type="text"
                role="combobox"
                aria-expanded={showSuggestions && suggestions.length > 0}
                placeholder={placeholder}
                title={title}
                value={value}
                onChange={event => {
                    onChange(event.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                // výběh myší zajišťuje onMouseDown na nápovědě – blur ji zavře dřív,
                // než by se stihl projevit click
                onBlur={() => setShowSuggestions(false)}
                onKeyDown={handleKeyDown}
                style={INPUT_STYLE}
            />
            {showSuggestions && suggestions.length > 0 && !exactMatch && (
                <ul className="list-group position-absolute w-100 shadow-sm" style={{zIndex: 20, top: '100%'}}>
                    {suggestions.map(suggestion => (
                        <li
                            key={suggestion.value}
                            className="list-group-item list-group-item-action py-1 small"
                            // mousedown před blur – jinak se seznam zavře a click nedopadne
                            onMouseDown={event => {
                                event.preventDefault();
                                onChange(suggestion.label);
                                setShowSuggestions(false);
                            }}
                        >
                            {suggestion.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default DataTableFilterCell;

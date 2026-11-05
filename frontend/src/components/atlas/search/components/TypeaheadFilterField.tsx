/**
 * Řádek vyhledávacího formuláře s typeaheadem –
 * skrytý input(y) drží vybranou hodnotu pro FormData submit.
 */

import {Typeahead} from 'react-bootstrap-typeahead';
import type {TypeaheadOption} from '../types';

interface TypeaheadFilterFieldProps {
    /** Tooltip celého řádku (nápověda pole). */
    title?: string;
    /** Popisek v první buňce řádku. */
    label?: string;
    /** Name skrytého inputu odesílaného ve formuláři. */
    name: string;
    /** Hodnota skrytého inputu (obvykle selected[0]?.id ?? výchozí). */
    value?: string | number;
    /** Více hodnot (multiple) – renderuje jeden hidden input na hodnotu. */
    values?: Array<string | number>;
    /** Id Typeaheadu (a11y). */
    id: string;
    options: TypeaheadOption[];
    selected: TypeaheadOption[];
    onChange: (selected: TypeaheadOption[]) => void;
    placeholder: string;
    multiple?: boolean;
}

export function TypeaheadFilterField({
                                         title,
                                         label,
                                         name,
                                         value,
                                         values,
                                         id,
                                         options,
                                         selected,
                                         onChange,
                                         placeholder,
                                         multiple,
                                     }: TypeaheadFilterFieldProps) {
    return (
        <tr title={title}>
            <td>{label}</td>
            <td>
                {values
                    ? values.map((itemValue) => (
                        <input key={`${name}-${itemValue}`} type="hidden" name={name} value={itemValue}/>
                    ))
                    : <input type="hidden" name={name} value={value ?? ''}/>}
                <Typeahead
                    id={id}
                    labelKey="label"
                    multiple={multiple}
                    onChange={(option) => onChange(option as TypeaheadOption[])}
                    options={options}
                    placeholder={placeholder}
                    selected={selected}
                    clearButton
                />
            </td>
        </tr>
    );
}

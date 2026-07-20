import {Form} from 'react-bootstrap';
import type {StatusOption} from '../types';

interface StatusSelectProps {
    value: number;
    options: StatusOption[];
    onChange: (newValue: number) => void;
    disabled: boolean;
}

export function StatusSelect({value, options, onChange, disabled}: StatusSelectProps) {
    const currentValue = value !== undefined && value !== null ? value : 0;

    return (
        <Form.Select
            value={currentValue}
            onChange={(e) => onChange(parseInt(e.target.value))}
            disabled={disabled}
            size="sm"
        >
            {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                    {opt.description || opt.name} [{opt.id}]
                </option>
            ))}
        </Form.Select>
    );
}

/**
 * Sdílený layout sekce hromadné úpravy: volitelný helper text, řádek
 * "label + vstup + submit tlačítko" (tlačítko vždy vpravo, warn barva).
 * Invalid stav textových inputů/selectů řeší samotný vstup přes `is-invalid`
 * (children); `invalid` tu spouští wrapper class pro typeaheady/autocomplete.
 */
import type {ReactNode} from 'react';

interface BulkEditFieldRowProps {
    label: string;
    submitLabel: string;
    onSubmit: () => void;
    disabled: boolean;
    invalid?: boolean;
    helperText?: string;
    children: ReactNode;
}

export function BulkEditFieldRow({
                                     label,
                                     submitLabel,
                                     onSubmit,
                                     disabled,
                                     invalid = false,
                                     helperText,
                                     children
                                 }: BulkEditFieldRowProps) {
    return (
        <>
            {helperText && <p className="small text-muted">{helperText}</p>}
            <div className="d-flex gap-2 align-items-end">
                <div className={`flex-grow-1 ${invalid ? 'bulk-edit-field-invalid' : ''}`}>
                    <label className="form-label">{label}</label>
                    {children}
                </div>
                <button type="button" className="btn btn-warning btn-sm" onClick={onSubmit} disabled={disabled}>
                    {submitLabel}
                </button>
            </div>
        </>
    );
}

import {useEffect, useRef, useState} from 'react';
import {Form, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';

interface PresliaInlineFieldProps {
    taxonId: number;
    value: string;
    onSave: (newValue: string) => Promise<void>;
    disabled: boolean;
}

export function PresliaInlineField({
                                       value,
                                       onSave,
                                       disabled
                                   }: PresliaInlineFieldProps) {
    const {t} = useTranslation();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const [saving, setSaving] = useState(false);

    // Zámek proti dvojitému odeslání: Enter nastaví saving=true, input se
    // zablokuje a prohlížeč na něm vystřelí blur, který by handleSave spustil
    // znovu (druhý POST se stejným timestampem pak selže na concurrency
    // kontrole). Ref místo state v closure – blur může proběhnout dřív,
    // než React commitne nový render se saving=true.
    const saveLockRef = useRef(false);

    useEffect(() => {
        if (!editing) {
            setDraft(value || '');
        }
    }, [value, editing]);

    const handleSave = async () => {
        if (saveLockRef.current) {
            return;
        }

        if (draft === value) {
            setEditing(false);
            return;
        }

        saveLockRef.current = true;
        setSaving(true);

        try {
            await onSave(draft);
            setEditing(false);
        } catch {
            // Chybu hlásí rodič přes notifikační store (toast); pole zůstává
            // otevřené s rozpracovanou hodnotou pro opravu a opakování.
            saveLockRef.current = false; // umožnit opravu a opakování
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setDraft(value || '');
            setEditing(false);
        }
    };

    const handleEdit = () => {
        if (disabled) {
            return;
        }
        saveLockRef.current = false; // nová editační relace
        setEditing(true);
    };

    if (editing) {
        return (
            <>
                <Form.Control
                    size="sm"
                    autoFocus
                    value={draft}
                    disabled={saving || disabled}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    style={{width: '120px', display: 'inline-block'}}
                />
                {saving && <Spinner size="sm" className="ms-1"/>}
            </>
        );
    }

    return (
        <span
            className="editable-value"
            style={{cursor: 'pointer'}}
            onClick={handleEdit}
            title={disabled ? 'Saving...' : t("common.inlineField.edit")}
        >
            {value || <span className="text-muted">—</span>}
            {!disabled && <i className="bi bi-pencil ms-1 small" aria-hidden="true"/>}
        </span>
    );
}

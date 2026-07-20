import {useEffect, useState} from 'react';
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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!editing) {
            setDraft(value || '');
        }
    }, [value, editing]);

    const handleSave = async () => {
        if (draft === value) {
            setEditing(false);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(draft);
            setEditing(false);
        } catch (e: any) {
            setError(e.message || t("common.inlineField.saveFailed"));
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
                {error && <span className="text-danger ms-1 small">{error}</span>}
            </>
        );
    }

    return (
        <span
            className="editable-value"
            style={{cursor: 'pointer'}}
            onClick={() => !disabled && setEditing(true)}
            title={disabled ? 'Saving...' : t("common.inlineField.edit")}
        >
            {value || <span className="text-muted">—</span>}
            {!disabled && <i className="bi bi-pencil ms-1 small" aria-hidden="true"/>}
        </span>
    );
}

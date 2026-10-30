import {useState} from 'react';
import {Col, Form, Row, Spinner, Button} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {patchRecordField} from '@/services/recordApi';
import {ApiError, apiErrorMessage} from '@/services/apiClient';

/** Volba selectu (hodnota i popisek jsou řetězce – pole záznamu po editaci). */
interface Option {
    value: string;
    label: string;
    icon?: string;
    color?: string;
}

interface Props {
    label: string;
    recordId: number;
    field: string;
    value: string | string[] | boolean | null;
    type?: 'text' | 'select' | 'boolean' | 'multi-value';
    options?: Option[];
    render?: (v: string | string[] | boolean | null) => React.ReactNode;
    onUpdated?: (data: { updatedValue: string | null, newTimestamp: number }) => void;
    lastEditTimestampNum?: number;
    validate?: (value: string) => string | null;
}

export default function RecordInlineField({
                                              label,
                                              recordId,
                                              field,
                                              value,
                                              type = 'text',
                                              options,
                                              render,
                                              onUpdated,
                                              lastEditTimestampNum,
                                              validate
                                          }: Props) {
    const {t} = useTranslation();
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Track the last edit timestamp locally to prevent parallel edits
    const [lastTimestamp, setLastTimestamp] = useState(lastEditTimestampNum ?? 0);
    // Editing state - must be at top level to be accessible from save()
    const [editing, setEditing] = useState(false);
    // Boolean switch keeps its own optimistic value; top-level hook (rules-of-hooks)
    const [internalValue, setInternalValue] = useState(draft);

    // Sync internal timestamp with prop when prop changes (e.g., after another field was edited) –
    // render-phase update guarded by comparison (React docs: adjusting state when a prop changes)
    if (lastEditTimestampNum !== undefined && lastEditTimestampNum !== lastTimestamp) {
        setLastTimestamp(lastEditTimestampNum);
    }

    async function save(valueToSave: unknown) {
        setSaving(true);
        setError(null);

        try {
            // server vrací hodnotu pod klíčem pole lowercase (např. "originalid")
            const result = await patchRecordField(recordId, field, valueToSave, lastTimestamp);
            if (result.updatedValue !== null) {
                setDraft(result.updatedValue);
            }
            if (result.lastEditTimestampNum) {
                setLastTimestamp(result.lastEditTimestampNum);
            }
            onUpdated?.({updatedValue: result.updatedValue, newTimestamp: result.lastEditTimestampNum});
            setEditing(false);
        } catch (e) {
            // 403 apod. notifikuje centrálně apiClient – zde jen propagujeme
            if (!(e instanceof ApiError && e.notified)) {
                setError(apiErrorMessage(e, t('common.inlineField.saveFailed')));
            }
        } finally {
            setSaving(false);
        }
    }

    const handleSaveWithValidation = () => {
        if (validate) {
            // validate se používá jen u textových polí
            const validationError = validate(draft as string);
            if (validationError) {
                setError(validationError);
                return;
            }
        }
        save(draft);
    };

    let content: React.ReactNode;

    if (type === 'boolean') {
        content = (
            <Form.Check
                type="switch"
                checked={!!internalValue}
                disabled={saving}
                onChange={async (e) => {
                    const newValue = e.target.checked;
                    setInternalValue(newValue);
                    await save(newValue);
                }}
            />
        );
    } else {
        if (!editing) {
            content = (
                <span className="d-inline-flex align-items-center">
                    <i
                        className="bi bi-pencil ms-2"
                        aria-hidden="true"
                        style={{cursor: 'pointer'}}
                        onClick={() => setEditing(true)}
                        title={t('common.inlineField.edit')}
                    />
                    <span
                        className="editable-value ms-1"
                        style={{cursor: 'pointer'}}
                        onClick={() => setEditing(true)}
                    >
                        {render ? render(draft) : draft ||
                            <span className="text-muted">{t('common.inlineField.add')}</span>}
                    </span>
                </span>
            );
        } else if (type === 'select') {
            content = renderSelect(options, draft as string | null, saving, save, setEditing);
        } else if (type === 'multi-value') {
            content = <MultiValueEditor value={draft as string[] | null} saving={saving} onSave={save}
                                        onDone={() => setEditing(false)}/>;
        } else {
            content = (
                <Form.Control
                    size="sm"
                    autoFocus
                    value={(draft as string | null) || ''}
                    disabled={saving}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        setError(null);
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveWithValidation();
                        } else if (e.key === 'Escape') {
                            setEditing(false);
                        }
                    }}
                    style={{maxWidth: '350px', display: 'inline-block'}}
                />
            );
        }
    }

    return (
        <Row className="align-items-center mb-1">
            <Col sm={3} className="text-muted small">
                {label}
            </Col>
            <Col sm={9}>
                {content}
                {saving && <Spinner size="sm" className="ms-2"/>}
                {error && <span className="text-danger ms-2">{error}</span>}
            </Col>
        </Row>
    );
}

function renderSelect(options: Option[] | undefined, draft: string | null, saving: boolean, save: (v: string) => void, setEditing: (v: boolean) => void) {
    return (
        <Form.Select
            size="sm"
            autoFocus
            value={draft ?? ''}
            disabled={saving}
            onChange={e => save(e.target.value)}
            onBlur={() => setEditing(false)}
            style={{maxWidth: '250px'}}
        >
            {options?.map(o => (
                <option key={o.value} value={o.value}>
                    {o.icon && `${o.icon} `}{o.label}
                </option>
            ))}
        </Form.Select>
    );
}

/**
 * Editor for "multi-value" fields (tags). A real component (rules-of-hooks):
 * it owns its state and resets it every time editing starts.
 */
function MultiValueEditor({value, saving, onSave, onDone}: {
    value: string[] | null | undefined;
    saving: boolean;
    onSave: (v: string[]) => void;
    onDone: () => void;
}) {
    const {t} = useTranslation();
    const [tags, setTags] = useState<string[]>(value || []);
    const [newTag, setNewTag] = useState('');

    const handleAddTag = () => {
        if (newTag.trim()) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const handleSaveTags = () => {
        onSave(tags);
        onDone();
    };

    return (
        <div>
            <div className="mb-2">
                {tags.map((tag: string, index: number) => (
                    <span
                        key={index}
                        className="badge bg-secondary me-1 mb-1"
                        style={{fontSize: '0.9em'}}
                    >
                        {tag}
                        <button
                            type="button"
                            className="btn-close btn-close-white ms-1"
                            style={{fontSize: '0.6em', verticalAlign: 'middle'}}
                            onClick={() => handleRemoveTag(index)}
                            disabled={saving}
                        />
                    </span>
                ))}
            </div>
            <div className="d-flex gap-2">
                <Form.Control
                    size="sm"
                    value={newTag}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                        }
                    }}
                    placeholder={t('common.inlineField.add')}
                    disabled={saving}
                    style={{maxWidth: '200px'}}
                />
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleAddTag}
                    disabled={saving || !newTag.trim()}
                >
                    ➕
                </Button>
            </div>
            <div className="mt-2">
                <Button
                    variant="success"
                    size="sm"
                    onClick={handleSaveTags}
                    disabled={saving}
                    className="me-2"
                >
                    {saving ? '...' : t('common.save')}
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onDone}
                    disabled={saving}
                >
                    {t('common.cancel')}
                </Button>
            </div>
        </div>
    );
}

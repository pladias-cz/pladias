import {useState, useEffect} from "react";
import {Col, Form, Row, Spinner, Button} from "react-bootstrap";
import {useTranslation} from "react-i18next";

interface Option<T = any> {
    value: T;
    label: T;
    icon?: string;
    color?: string;
}

interface Props {
    label: string;
    recordId: number;
    field: string;
    value: any;
    type?: "text" | "select" | "boolean" | "multi-value";
    options?: Option[];
    render?: (v: any) => React.ReactNode;
    onUpdated?: (data: {updatedValue: any, newTimestamp: number}) => void;
    lastEditTimestampNum?: number;
    validate?: (value: any) => string | null;
}

export default function RecordInlineField({
                                              label,
                                              recordId,
                                              field,
                                              value,
                                              type = "text",
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
    
    // Sync internal timestamp with prop when prop changes (e.g., after another field was edited)
    useEffect(() => {
        if (lastEditTimestampNum !== undefined && lastEditTimestampNum !== lastTimestamp) {
            setLastTimestamp(lastEditTimestampNum);
        }
    }, [lastEditTimestampNum]);

    async function save(valueToSave: any) {
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/react/atlas/record/${recordId}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    key: field,
                    value: valueToSave,
                    lastEditTimestampNum: lastTimestamp
                }),
            });

            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg || t("common.inlineField.saveFailed"));
            }

            const responseData = await response.json();
            // Server returns value with lowercase field key (e.g., "originalid")
            const fieldKeyLower = field.toLowerCase();
            const updatedValue = responseData.data[fieldKeyLower];
            const newTimestamp = responseData.data.lastEditTimestampNum;
            if (updatedValue !== undefined) {
                setDraft(updatedValue);
            }
            if (newTimestamp) {
                setLastTimestamp(newTimestamp);
            }
            onUpdated?.({updatedValue, newTimestamp});
            setEditing(false);
        } catch (e: any) {
            setError(e.message || t("common.inlineField.saveFailed"));
        } finally {
            setSaving(false);
        }
    }

    const handleSaveWithValidation = () => {
        if (validate) {
            const validationError = validate(draft);
            if (validationError) {
                setError(validationError);
                return;
            }
        }
        save(draft);
    };

    const EditIcon = ({onClick}: { onClick: () => void }) => (
        <i
            className="bi bi-pencil ms-2"
            aria-hidden="true"
            style={{cursor: "pointer"}}
            onClick={onClick}
            title={t("common.inlineField.edit")}
        />
    );

    let content: React.ReactNode;

    if (type === "boolean") {
        const [internalValue, setInternalValue] = useState(draft);
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
                    <EditIcon onClick={() => setEditing(true)}/>
                    <span
                        className="editable-value ms-1"
                        style={{cursor: "pointer"}}
                        onClick={() => setEditing(true)}
                    >
                        {render ? render(draft) : draft || <span className="text-muted">{t("common.inlineField.add")}</span>}
                    </span>
                </span>
            );
        } else if (type === "select") {
            content = renderSelect(options, draft, saving, save, setEditing);
        } else if (type === "multi-value") {
            content = renderMultiValue(draft, save, setEditing, t, saving);
        } else {
            content = (
                <Form.Control
                    size="sm"
                    autoFocus
                    value={draft || ""}
                    disabled={saving}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        setError(null);
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveWithValidation();
                        } else if (e.key === "Escape") {
                            setEditing(false);
                        }
                    }}
                    style={{maxWidth: "350px", display: "inline-block"}}
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

function renderSelect(options: Option[] | undefined, draft: any, saving: boolean, save: (v: any) => void, setEditing: (v: boolean) => void) {
    return (
        <Form.Select
            size="sm"
            autoFocus
            value={draft ?? ""}
            disabled={saving}
            onChange={e => save(e.target.value)}
            onBlur={() => setEditing(false)}
            style={{maxWidth: "250px"}}
        >
            {options?.map(o => (
                <option key={o.value} value={o.value}>
                    {o.icon && `${o.icon} `}{o.label}
                </option>
            ))}
        </Form.Select>
    );
}

function renderMultiValue(draft: any, save: (v: any) => void, setEditing: (v: boolean) => void, t: any, saving: boolean) {
    const [tags, setTags] = useState<string[]>(draft || []);
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
        save(tags);
        setEditing(false);
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
                    onChange={(e: any) => setNewTag(e.target.value)}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                        }
                    }}
                    placeholder={t("common.inlineField.add")}
                    disabled={saving}
                    style={{maxWidth: "200px"}}
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
                    onClick={() => setEditing(false)}
                    disabled={saving}
                >
                    {t('common.cancel')}
                </Button>
            </div>
        </div>
    );
}
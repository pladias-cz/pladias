import {useState, useEffect} from "react";
import {Button, Form, Spinner} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type {MultiValueOption} from "@/models/MultiValueOption";

interface Props {
    label: string;
    recordId: number;
    currentValue: MultiValueOption[];
    endpoint: string;
    addKey: string;      // API key for adding (e.g., "ADDHERBARIUM")
    deleteKey: string;   // API key for deleting (e.g., "DELETEHERBARIUM")
    onUpdated?: (data: {updatedValue: MultiValueOption[], newTimestamp: number}) => void;
    lastEditTimestampNum?: number;
}

export default function MultiSelectEdit({
    label,
    recordId,
    currentValue,
    endpoint,
    addKey,
    deleteKey,
    onUpdated,
    lastEditTimestampNum
}: Props) {
    const {t} = useTranslation();
    const [options, setOptions] = useState<MultiValueOption[]>([]);
    const [selected, setSelected] = useState<MultiValueOption[]>(currentValue);
    const [pendingAdd, setPendingAdd] = useState<MultiValueOption | null>(null);
    const [availableOptions, setAvailableOptions] = useState<MultiValueOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [lastTimestamp, setLastTimestamp] = useState(lastEditTimestampNum ?? 0);

    // Sync selected with currentValue prop
    useEffect(() => {
        setSelected(currentValue);
    }, [currentValue]);

    // Sync internal timestamp with prop
    useEffect(() => {
        if (lastEditTimestampNum !== undefined && lastEditTimestampNum !== lastTimestamp) {
            setLastTimestamp(lastEditTimestampNum);
        }
    }, [lastEditTimestampNum]);

    // Fetch available options when editing starts
    useEffect(() => {
        if (editing) {
            fetch(endpoint)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        const fetchedOptions: MultiValueOption[] = data.data.map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            label: item.label
                        }));
                        setOptions(fetchedOptions);
                        updateAvailableOptions(fetchedOptions, selected);
                    }
                })
                .catch(err => {
                    setError(err.message || t("common.multiValueEdit.loadFailed"));
                });
        }
    }, [editing]);

    // Update available options when options or selected change
    useEffect(() => {
        if (options.length > 0) {
            updateAvailableOptions(options, selected);
        }
    }, [options, selected]);

    // No auto-clear of pendingAdd - it stays until submit or cancel

    function updateAvailableOptions(allOptions: MultiValueOption[], selectedOptions: MultiValueOption[]) {
        const selectedIds = new Set(selectedOptions.map(o => o.id));
        const available = allOptions.filter(o => !selectedIds.has(o.id));
        setAvailableOptions(available);
    }

    async function sendApiRequest(key: string, value: number) {
        try {
            const response = await fetch(`/api/react/atlas/record/${recordId}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    key: key,
                    value: value.toString(),
                    lastEditTimestampNum: lastTimestamp
                }),
            });

            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg || t("common.multiValueEdit.saveFailed"));
            }

            const responseData = await response.json();
            const newTimestamp = responseData.data?.lastEditTimestampNum;
            if (newTimestamp) {
                setLastTimestamp(newTimestamp);
            }
            return responseData;
        } catch (e: any) {
            setError(e.message || t("common.multiValueEdit.saveFailed"));
            throw e;
        }
    }

    function selectOption(option: MultiValueOption) {
        // Set as pending - wait for submit
        setPendingAdd(option);
    }

    async function handleSubmit() {
        if (!pendingAdd) return;
        setSaving(true);
        setError(null);
        try {
            await sendApiRequest(addKey, pendingAdd.id);
            const newSelected = [...selected, pendingAdd];
            setSelected(newSelected);
            onUpdated?.({updatedValue: newSelected, newTimestamp: lastTimestamp});
            setPendingAdd(null);
            setSaving(false);
        } catch (e) {
            setSaving(false);
        }
    }

    async function handleRemove(option: MultiValueOption) {
        if (window.confirm(t("common.multiValueEdit.confirmDeleteMessage", {name: option.name}))) {
            // Optimistic update - remove immediately from UI
            const newSelected = selected.filter(o => o.id !== option.id);
            setSelected(newSelected);
            onUpdated?.({
                updatedValue: newSelected,
                newTimestamp: lastTimestamp
            });

            setSaving(true);
            setError(null);
            try {
                await sendApiRequest(deleteKey, option.id);
            } catch (e) {
                // On error, restore the removed item
                setSelected(selected);
            } finally {
                setSaving(false);
            }
        }
    }

    function handleCancel() {
        setSelected(currentValue);
        setEditing(false);
    }

    let content: React.ReactNode;

    if (!editing) {
        content = (
            <div className="d-flex flex-wrap gap-1">
                {selected.length === 0 ? (
                    <span className="text-muted">{t("common.multiValueEdit.none")}</span>
                ) : (
                    selected.map(option => (
                        <span key={option.id} className="badge bg-secondary" title={option.label}>
                            {option.name}
                        </span>
                    ))
                )}
            </div>
        );
    } else {
        content = (
            <div>
                <div className="mb-2">
                    {/*<strong className="d-block mb-2">{t("common.multiValueEdit.current")}</strong>*/}
                    <div className="d-flex flex-wrap gap-1 mb-3">
                        {selected.length === 0 ? (
                            <span className="text-muted small">{t("common.multiValueEdit.none")}</span>
                        ) : (
                            selected.map(option => (
                                <span key={option.id} className="badge bg-primary fs-6" title={option.label}>
                                    {option.name}
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white ms-1"
                                        style={{fontSize: '0.7em', verticalAlign: 'middle'}}
                                        onClick={() => handleRemove(option)}
                                        disabled={saving}
                                        title={t("common.multiValueEdit.remove")}
                                    />
                                </span>
                            ))
                        )}
                    </div>

                    <strong className="d-block mb-2">{t("common.multiValueEdit.available")}</strong>
                    <div className="d-flex gap-2 mb-2">
                        <Form.Select
                            size="sm"
                            value={pendingAdd?.id.toString() || ""}
                            onChange={e => {
                                const option = availableOptions.find(o => o.id === Number(e.target.value));
                                if (option) {
                                    selectOption(option);
                                }
                            }}
                            disabled={saving || availableOptions.length === 0}
                            className="flex-grow-1"
                        >
                            <option value="">-- {t("common.select")} --</option>
                            {availableOptions.map(option => (
                                <option key={option.id} value={option.id} title={option.label}>
                                    {option.name}
                                </option>
                            ))}
                        </Form.Select>
                        {pendingAdd && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSubmit}
                                disabled={saving}
                            >
                                {t("common.inlineField.add")}
                            </Button>
                        )}
                    </div>

                    {availableOptions.length === 0 && (
                        <small className="text-muted">{t("common.multiValueEdit.noMoreAvailable")}</small>
                    )}
                </div>

                <div className="d-flex gap-2">
                    {pendingAdd && (
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setPendingAdd(null)}
                            disabled={saving}
                        >
                            {t('common.cancel')}
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCancel}
                        disabled={saving}
                    >
                        {t('common.close')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="row align-items-center mb-1">
                <div className="col-sm-3 text-muted small">
                    {label}
                </div>
                <div className="col-sm-9 d-flex align-items-center">
                    {!editing && (
                        <i
                            className="bi bi-pencil me-2"
                            aria-hidden="true"
                            style={{cursor: "pointer"}}
                            onClick={() => setEditing(true)}
                            title={t("common.inlineField.edit")}
                        />
                    )}
                    <span
                        className="editable-value"
                        style={{cursor: "pointer"}}
                        onClick={() => !editing && setEditing(true)}
                        title={t("common.inlineField.edit")}
                    >
                        {!editing && content}
                    </span>
                    {editing && content}
                    {saving && <Spinner size="sm" className="ms-2"/>}
                    {error && <span className="text-danger ms-2">{error}</span>}
                </div>
            </div>
        </>
    );
}
import {useState, useEffect} from "react";
import {Form, Spinner} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type {MultiValueOption} from "@/models/MultiValueOption";

interface Props {
    label: string;
    recordId: number;
    currentValue: MultiValueOption | null;
    endpoint: string;
    field: string;
    onUpdated?: (data: {updatedValue: MultiValueOption | null, newTimestamp: number}) => void;
    lastEditTimestampNum?: number;
    renderDisplay?: (option: MultiValueOption) => React.ReactNode;
}

export default function SingleSelectEdit({
    label,
    recordId,
    currentValue,
    endpoint,
    field,
    onUpdated,
    lastEditTimestampNum,
    renderDisplay
}: Props) {
    const {t} = useTranslation();
    const [options, setOptions] = useState<MultiValueOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [lastTimestamp, setLastTimestamp] = useState(lastEditTimestampNum ?? 0);

    // Sync internal timestamp with prop
    useEffect(() => {
        if (lastEditTimestampNum !== undefined && lastEditTimestampNum !== lastTimestamp) {
            setLastTimestamp(lastEditTimestampNum);
        }
    }, [lastEditTimestampNum, lastTimestamp]);

    // Fetch available options when editing starts
    useEffect(() => {
        if (editing) {
            fetch(endpoint)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        const fetchedOptions: MultiValueOption[] = data.data.map((item: { id: number; name?: string; nameLat?: string; label?: string; nameHtml?: string }) => ({
                            id: item.id,
                            name: item.name ?? item.nameLat ?? "",
                            label: item.label ?? item.nameHtml
                        }));
                        setOptions(fetchedOptions);
                    }
                })
                .catch((err: Error) => {
                    setError(err.message || t("common.singleSelectEdit.loadFailed"));
                });
        }
    }, [editing, endpoint, t]);

    async function sendApiRequest(key: string, value: number | null) {
        try {
            const response = await fetch(`/api/react/atlas/record/${recordId}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    key: key,
                    value: value?.toString() ?? '',
                    lastEditTimestampNum: lastTimestamp
                }),
            });

            if (!response.ok) {
                const msg = await response.text();
                throw new Error(msg || t("common.singleSelectEdit.saveFailed"));
            }

            const responseData = await response.json();
            const newTimestamp = responseData.data?.lastEditTimestampNum;
            if (newTimestamp) {
                setLastTimestamp(newTimestamp);
            }
            return responseData;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t("common.singleSelectEdit.saveFailed");
            setError(errorMessage);
            throw error;
        }
    }

    function handleSelectChange(optionId: number) {
        const option = options.find(o => o.id === optionId);
        if (!option) return;
        setSelectedOption(option);
    }

    async function handleSubmit() {
        if (!selectedOption) return;

        setSaving(true);
        setError(null);
        try {
            const responseData = await sendApiRequest(field, selectedOption.id);
            const newTimestamp = responseData.data?.lastEditTimestampNum || lastTimestamp;
            onUpdated?.({updatedValue: selectedOption, newTimestamp});
            setEditing(false);
        } catch {
            // On error, stay in edit mode
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setSelectedOption(null);
        setEditing(false);
    }

    const [selectedOption, setSelectedOption] = useState<MultiValueOption | null>(null);

    let displayContent: React.ReactNode;

    if (!currentValue) {
        displayContent = <span className="text-muted">{t("common.singleSelectEdit.none")}</span>;
    } else if (renderDisplay) {
        displayContent = renderDisplay(currentValue);
    } else {
        displayContent = <>{currentValue.name}</>;
    }

    return (
        <>
            <div className="row align-items-center mb-1">
                <div className="col-sm-3 text-muted small">
                    {label}
                </div>
                <div className="col-sm-9">
                    {!editing && (
                        <>
                            <i
                                className="bi bi-pencil ms-2"
                                aria-hidden="true"
                                style={{cursor: "pointer"}}
                                onClick={() => setEditing(true)}
                                title={t("common.singleSelectEdit.edit")}
                            />
                            <span
                                className="editable-value ms-1"
                                style={{cursor: "pointer"}}
                                onClick={() => setEditing(true)}
                                title={t("common.singleSelectEdit.edit")}
                            >
                                {displayContent}
                            </span>
                        </>
                    )}
                    {editing && (
                        <div>
                            <Form.Select
                                size="sm"
                                value={selectedOption?.id.toString() || currentValue?.id.toString() || ""}
                                onChange={e => {
                                    const optionId = Number(e.target.value);
                                    if (optionId) {
                                        handleSelectChange(optionId);
                                    }
                                }}
                                disabled={saving || options.length === 0}
                                className="flex-grow-1 d-inline-block"
                                style={{maxWidth: "300px"}}
                            >
                                <option value="">-- {t("common.select")} --</option>
                                {options.map(option => (
                                    <option key={option.id} value={option.id} title={option.label}>
                                        {option.name}
                                    </option>
                                ))}
                            </Form.Select>
                            
                            <button
                                type="button"
                                className="btn btn-primary btn-sm ms-2"
                                onClick={handleSubmit}
                                disabled={saving || !selectedOption}
                            >
                                {t('common.ok')}
                            </button>
                            
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm ms-2"
                                onClick={handleCancel}
                                disabled={saving}
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    )}
                    {saving && <Spinner size="sm" className="ms-2"/>}
                    {error && <span className="text-danger ms-2">{error}</span>}
                </div>
            </div>
        </>
    );
}

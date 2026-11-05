import {useState, useEffect} from 'react';
import {Form, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {MultiValueOption} from '@/models/MultiValueOption';
import {patchRecordField} from '@/services/recordApi';
import {ApiError, apiErrorMessage} from '@/services/apiClient';

interface Props {
    label: string;
    recordId: number;
    currentValue: MultiValueOption | null;
    /** načte dostupné volby pro výběr */
    loadOptions: () => Promise<MultiValueOption[]>;
    field: string;
    onUpdated?: (data: { updatedValue: MultiValueOption | null, newTimestamp: number }) => void;
    lastEditTimestampNum?: number;
    renderDisplay?: (option: MultiValueOption) => React.ReactNode;
}

export default function SingleSelectEdit({
                                             label,
                                             recordId,
                                             currentValue,
                                             loadOptions,
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

    // Sync internal timestamp with prop when prop changes (e.g., after another
    // field was edited) – render-phase update guarded by comparison
    // (React docs: adjusting state when a prop changes, without an effect).
    if (lastEditTimestampNum !== undefined && lastEditTimestampNum !== lastTimestamp) {
        setLastTimestamp(lastEditTimestampNum);
    }

    // Fetch available options when editing starts
    useEffect(() => {
        if (editing) {
            loadOptions()
                .then(setOptions)
                .catch((err: unknown) => {
                    setError(apiErrorMessage(err, t('common.singleSelectEdit.loadFailed')));
                });
        }
    }, [editing, loadOptions, t]);

    async function sendApiRequest(key: string, value: number | null) {
        try {
            const result = await patchRecordField(recordId, key, value?.toString() ?? '', lastTimestamp);
            const newTimestamp = result.lastEditTimestampNum;
            if (newTimestamp) {
                setLastTimestamp(newTimestamp);
            }
            return result;
        } catch (e) {
            // 403 apod. notifikuje centrálně apiClient – zde jen propagujeme
            if (!(e instanceof ApiError && e.notified)) {
                setError(apiErrorMessage(e, t('common.singleSelectEdit.saveFailed')));
            }
            throw e;
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
            const result = await sendApiRequest(field, selectedOption.id);
            const newTimestamp = result.lastEditTimestampNum || lastTimestamp;
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
        displayContent = <span className="text-muted">{t('common.singleSelectEdit.none')}</span>;
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
                                style={{cursor: 'pointer'}}
                                onClick={() => setEditing(true)}
                                title={t('common.edit')}
                            />
                            <span
                                className="editable-value ms-1"
                                style={{cursor: 'pointer'}}
                                onClick={() => setEditing(true)}
                                title={t('common.edit')}
                            >
                                {displayContent}
                            </span>
                        </>
                    )}
                    {editing && (
                        <div>
                            <Form.Select
                                size="sm"
                                value={selectedOption?.id.toString() || currentValue?.id.toString() || ''}
                                onChange={e => {
                                    const optionId = Number(e.target.value);
                                    if (optionId) {
                                        handleSelectChange(optionId);
                                    }
                                }}
                                disabled={saving || options.length === 0}
                                className="flex-grow-1 d-inline-block"
                                style={{maxWidth: '300px'}}
                            >
                                <option value="">-- {t('common.select')} --</option>
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

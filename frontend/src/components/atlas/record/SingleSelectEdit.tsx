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
    /** výběr nelze ovládat (např. dokud není vyplněn rodičovský výběr) – řádek se zobrazí needitovatelně */
    disabled?: boolean;
    /** proč je výběr zamčený; zobrazí se místo hodnoty */
    disabledHint?: string;
    /** umožňuje hodnotu vymazat (PATCH s `null` hodnotou) – bez tego volby jde jen měnit, ne zrušit */
    clearable?: boolean;
    /** popisek volby pro vymazání (výchozí `common.singleSelectEdit.clear`) */
    clearLabel?: string;
    /** vysvětlivka pod řádkem – např. provázání s jiným polem */
    hint?: string;
}

export default function SingleSelectEdit({
                                             label,
                                             recordId,
                                             currentValue,
                                             loadOptions,
                                             field,
                                             onUpdated,
                                             lastEditTimestampNum,
                                             renderDisplay,
                                             disabled = false,
                                             disabledHint,
                                             clearable = false,
                                             clearLabel,
                                             hint
                                         }: Props) {
    const {t} = useTranslation();
    const [options, setOptions] = useState<MultiValueOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [lastTimestamp, setLastTimestamp] = useState(lastEditTimestampNum ?? 0);
    const [selectedOption, setSelectedOption] = useState<MultiValueOption | null>(null);
    // záměr vymazat hodnotu – `selectedOption === null` samo neznamená „vymazat“,
    // dokud uživatel prázdnou volbu skutečně nezvolil
    const [clearRequested, setClearRequested] = useState(false);

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
            // null → JSON null (vymazat pole), nikoli prázdný string
            const result = await patchRecordField(recordId, key, value?.toString() ?? null, lastTimestamp);
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

    function handleSelectChange(value: string) {
        // prázdná hodnota = záměr vymazat; bez toho se dal výběr jen měnit, ne zrušit
        if (value === '') {
            setClearRequested(true);
            setSelectedOption(null);
            return;
        }
        const option = options.find(o => o.id === Number(value));
        if (!option) return;
        setClearRequested(false);
        setSelectedOption(option);
    }

    async function handleSubmit() {
        const chosen = clearRequested ? null : selectedOption;
        if (chosen === null && !clearRequested) return;

        setSaving(true);
        setError(null);
        try {
            const result = await sendApiRequest(field, chosen?.id ?? null);
            const newTimestamp = result.lastEditTimestampNum || lastTimestamp;
            onUpdated?.({updatedValue: chosen, newTimestamp});
            setEditing(false);
            setSelectedOption(null);
            setClearRequested(false);
        } catch {
            // On error, stay in edit mode
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setSelectedOption(null);
        setClearRequested(false);
        setEditing(false);
    }

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
                    {!editing && disabled && (
                        <span className="ms-2 text-muted small">{disabledHint ?? displayContent}</span>
                    )}
                    {!editing && !disabled && (
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
                                value={clearRequested ? '' : (selectedOption?.id.toString() || currentValue?.id.toString() || '')}
                                onChange={e => handleSelectChange(e.target.value)}
                                disabled={saving || options.length === 0}
                                className="flex-grow-1 d-inline-block"
                                style={{maxWidth: '300px'}}
                            >
                                {clearable ? (
                                    <option value="">{clearLabel ?? t('common.singleSelectEdit.clear')}</option>
                                ) : (
                                    <option value="">-- {t('common.select')} --</option>
                                )}
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
                                disabled={saving || (selectedOption === null && !clearRequested)}
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
                    {hint && !disabled && <div className="text-muted small">{hint}</div>}
                </div>
            </div>
        </>
    );
}

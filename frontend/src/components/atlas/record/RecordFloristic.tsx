import {Card, Col, Row} from "react-bootstrap";
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';
import RecordInlineField from "./RecordInlineField";
import {useRecordPermissions} from ".";
import RecordReadonlyField from "@/components/atlas/record/RecordReadonlyField.tsx";
import MultiSelectEdit from "@/components/atlas/record/MultiSelectEdit.tsx";
import SingleSelectEdit from "@/components/atlas/record/SingleSelectEdit.tsx";
import type {MultiValueOption} from "@/models/MultiValueOption.ts";
import {useInstanceConfig} from "@/context/InstanceConfigContext";

// Date format validation: YYYY, YYYY-MM, YYYY-MM-DD, or "s. d." (sine data - without date)
const validateDateFormat = (value: any): string | null => {
    const strValue = String(value ?? '').trim();

    // Allow empty values (will be handled by backend)
    if (strValue === '') {
        return null;
    }

    // Allow "s. d." (sine data - without date)
    if (strValue.toLowerCase() === 's. d.') {
        return null;
    }

    // Pattern: YYYY, YYYY-MM, or YYYY-MM-DD
    const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;

    if (!datePattern.test(strValue)) {
        return 'Date must be in format YYYY, YYYY-MM, YYYY-MM-DD, or "s. d."';
    }

    // Additional validation for month and day values if present
    const parts = strValue.split('-');
    if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        if (month < 1 || month > 12) {
            return 'Month must be between 01 and 12';
        }
    }
    if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        if (day < 1 || day > 31) {
            return 'Day must be between 01 and 31';
        }
    }

    return null;
};

interface RecordFloristicProps {
    record: RecordPladiasFull;
    onFieldUpdated?: (newTimestamp?: number) => void;
}

export default function RecordFloristic({record, onFieldUpdated}: RecordFloristicProps) {
    const {t} = useTranslation();

    // Local state to track record updates
    const [localRecord, setLocalRecord] = useState<RecordPladiasFull>(record);

    const config = useInstanceConfig() as { isVascular?: boolean };
    const isVascular = Boolean(config.isVascular);

    // Sync localRecord with record prop when ID changes OR when timestamp changes from external source
    // This ensures all components see the latest timestamp for conflict detection
    // But we preserve optimistic updates by only syncing fields that came from backend
    useEffect(() => {
        if (record.id !== localRecord.id) {
            // Record changed completely - full sync
            setLocalRecord(record);
        } else if (record.lastEditTimestampNum !== localRecord.lastEditTimestampNum) {
            // Timestamp changed externally (from another component) - sync timestamp only
            setLocalRecord((prev) => ({
                ...prev,
                lastEditTimestampNum: record.lastEditTimestampNum
            }));
        }
    }, [record.id, record.lastEditTimestampNum]);

    const {canEdit} = useRecordPermissions(localRecord);

    // Memoize currentValue to prevent unnecessary re-renders in MultiValueEdit
    const authorsOptions = useMemo(() => localRecord.recordAuthors.map((a): MultiValueOption => ({
        id: a.authorId,
        name: a.authorFullName,
        label: ""
    })), [localRecord.recordAuthors]);

    // Taxon as single select option
    const taxonOption: MultiValueOption | null = useMemo(() => {
        if (!localRecord.taxonId) return null;
        return {
            id: localRecord.taxonId,
            name: localRecord.taxonNameLat ?? "",
            label: localRecord.taxonNameHtml ?? localRecord.taxonNameLat ?? ""
        };
    }, [localRecord.taxonId, localRecord.taxonNameLat, localRecord.taxonNameHtml]);

    // Phytochorion as single select option
    const phytochorionOption: MultiValueOption | null = useMemo(() => {
        if (!localRecord.phytochorionRelationId) return null;
        return {
            id: parseInt(localRecord.phytochorionRelationId, 10),
            name: localRecord.phytochorionRelationName ?? "",
            label: localRecord.phytochorionRelationName ?? ""
        };
    }, [localRecord.phytochorionRelationId, localRecord.phytochorionRelationName]);

    // Handler for field updates - only updates local state, no API call
    // RecordInlineField already handles the API call
    const handleSave = (field: string, data: { updatedValue: any, newTimestamp: number }) => {
        const fieldMapping: { [key: string]: keyof RecordPladiasFull } = {
            'LOCALITY': 'locality',
            'ORIGINALNAME': 'taxonOriginal',
            'NEARESTTOWNNAME': 'nearestTownText',
            'IMPORTCOMMENT': 'comment',
            'ALTITUDEMIN': 'altitudeMin',
            'ALTITUDEMAX': 'altitudeMax',
            'DATE': 'dateIso',
        };

        const mappedField = fieldMapping[field];
        if (mappedField) {
            let updatedValue = data.updatedValue;
            // Convert numeric values for altitude fields - handle empty string as null
            if (field === 'ALTITUDEMIN' || field === 'ALTITUDEMAX') {
                const strValue = String(data.updatedValue).trim();
                updatedValue = strValue === '' ? null : parseInt(strValue, 10);
            }

            setLocalRecord((prev: RecordPladiasFull) => ({
                ...prev,
                [mappedField]: updatedValue,
                lastEditTimestampNum: data.newTimestamp
            }));
        }
        // Propagate timestamp update to parent
        onFieldUpdated?.(data.newTimestamp);
    };

    return (
        <Row className="mb-3">
            <Col>
                <Card>
                    <Card.Header>
                        <strong>{t("record.titles.floristic")}</strong>
                    </Card.Header>
                    <Card.Body>
                        {canEdit && <>
                            <SingleSelectEdit
                                label={t("record.taxon")}
                                recordId={localRecord.id}
                                currentValue={taxonOption}
                                endpoint={`/api/react/taxa/importable/record/${localRecord.id}`}
                                field="TAXON"
                                renderDisplay={(option) => (
                                    <span dangerouslySetInnerHTML={{__html: option.label || option.name}}/>
                                )}
                                onUpdated={(data) => {
                                    if (data.updatedValue) {
                                        const {id, name, label} = data.updatedValue;
                                        setLocalRecord((prev: RecordPladiasFull) => ({
                                            ...prev,
                                            taxonId: id,
                                            taxonNameLat: name,
                                            taxonNameHtml: label ?? name,
                                            lastEditTimestampNum: data.newTimestamp
                                        }));
                                    } else {
                                        setLocalRecord((prev: RecordPladiasFull) => ({
                                            ...prev,
                                            taxonId: null,
                                            taxonNameLat: null,
                                            taxonNameHtml: null,
                                            lastEditTimestampNum: data.newTimestamp
                                        }));
                                    }
                                    onFieldUpdated?.(data.newTimestamp);
                                }}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                            {isVascular && (
                                <SingleSelectEdit
                                    label={t("record.phytochorion")}
                                    recordId={localRecord.id}
                                    currentValue={phytochorionOption}
                                    endpoint="/api/react/selectOptions/phytochorions"
                                    field="PHYTOCHORION"
                                    onUpdated={(data) => {
                                        if (data.updatedValue) {
                                            const {id, name} = data.updatedValue;
                                            setLocalRecord((prev: RecordPladiasFull) => ({
                                                ...prev,
                                                phytochorionRelationId: id.toString(),
                                                phytochorionRelationName: name,
                                                lastEditTimestampNum: data.newTimestamp
                                            }));
                                        } else {
                                            setLocalRecord((prev: RecordPladiasFull) => ({
                                                ...prev,
                                                phytochorionRelationId: null,
                                                phytochorionRelationName: null,
                                                lastEditTimestampNum: data.newTimestamp
                                            }));
                                        }
                                        onFieldUpdated?.(data.newTimestamp);
                                    }}
                                    lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                                />
                            )}

                            {(!isVascular && (
                                    <>
                                        <RecordReadonlyField label={t("record.substrateText")}
                                                             content={localRecord.substrate}/>
                                        <RecordReadonlyField label={t("record.chemical")}
                                                             content={localRecord.chemical}/>
                                        <RecordReadonlyField label={t("record.substrate1")}
                                                             content={localRecord.substrate}/>
                                        <RecordReadonlyField label={t("record.substrate2")}
                                                             content={localRecord.substrate}/>
                                    </>)
                            )}
                            <RecordInlineField
                                label={t("record.nameOriginal")}
                                recordId={localRecord.id}
                                field="ORIGINALNAME"
                                value={localRecord.taxonOriginal}
                                onUpdated={data => handleSave('ORIGINALNAME', data)}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                            {isVascular && (<RecordInlineField
                                    label={t("record.nearestTown")}
                                    recordId={localRecord.id}
                                    field="NEARESTTOWNNAME"
                                    value={localRecord.nearestTownText}
                                    onUpdated={data => handleSave('NEARESTTOWNNAME', data)}
                                    lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                                />
                            )}
                            <RecordInlineField
                                label={t("record.locality")}
                                recordId={localRecord.id}
                                field="LOCALITY"
                                value={localRecord.locality}
                                onUpdated={data => handleSave('LOCALITY', data)}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                            {!isVascular && (
                                <RecordInlineField
                                    label={t("record.localityExtra")}
                                    recordId={localRecord.id}
                                    field="LOCALITYEXTRA"
                                    value={localRecord.localityExtra}
                                    onUpdated={data => handleSave('LOCALITYEXTRA', data)}
                                    lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                                />
                            )}
                            <RecordInlineField
                                label={t("record.comment")}
                                recordId={localRecord.id}
                                field="IMPORTCOMMENT"
                                value={localRecord.comment}
                                onUpdated={data => handleSave('IMPORTCOMMENT', data)}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                            <RecordInlineField
                                label={t("record.altitudeMin")}
                                recordId={localRecord.id}
                                field="ALTITUDEMIN"
                                value={localRecord?.altitudeMin?.toString() ?? ''}
                                onUpdated={data => handleSave('ALTITUDEMIN', data)}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                            <RecordInlineField
                                label={t("record.altitudeMax")}
                                recordId={localRecord.id}
                                field="ALTITUDEMAX"
                                value={localRecord?.altitudeMax?.toString() ?? ''}
                                onUpdated={data => handleSave('ALTITUDEMAX', data)}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                            <RecordInlineField
                                label={t("record.date")}
                                recordId={localRecord.id}
                                field="DATE"
                                value={localRecord.dateIso}
                                onUpdated={data => handleSave('DATE', data)}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                                validate={validateDateFormat}
                            />
                            <MultiSelectEdit
                                label={t("record.authors")}
                                recordId={localRecord.id}
                                currentValue={authorsOptions}
                                endpoint={`/api/react/atlas/record/${localRecord.id}/unassignedAuthors`}
                                addKey="ADDFINDER"
                                deleteKey="DELETEFINDER"
                                onUpdated={(data) => {
                                    setLocalRecord((prev: RecordPladiasFull) => {
                                        const newRecordAuthors = data.updatedValue.map((opt): any => ({
                                            authorId: opt.id,
                                            authorFullName: opt.name,
                                        }));
                                        return {
                                            ...prev,
                                            recordAuthors: newRecordAuthors,
                                            lastEditTimestampNum: data.newTimestamp
                                        };
                                    });
                                    onFieldUpdated?.(data.newTimestamp);
                                }}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />

                        </>}
                        {!canEdit && <>
                            <RecordReadonlyField label={t("record.taxon")} content={localRecord.taxon.nameLat}/>
                            {isVascular ? (<RecordReadonlyField label={t("record.phytochorion")}
                                                                content={localRecord.phytochorionRelationName}/>
                            ) : (
                                <>
                                    <RecordReadonlyField label={t("record.substrateText")}
                                                         content={localRecord.substrate}/>
                                    <RecordReadonlyField label={t("record.chemical")}
                                                         content={localRecord.chemical}/>
                                    <RecordReadonlyField label={t("record.substrate1")}
                                                         content={localRecord.substrate}/>
                                    <RecordReadonlyField label={t("record.substrate2")}
                                                         content={localRecord.substrate}/>
                                </>
                            )}
                            <RecordReadonlyField label={t("record.nameOriginal")} content={localRecord.taxonOriginal}/>
                            {isVascular && (<RecordReadonlyField label={t("record.nearestTown")}
                                                                 content={localRecord.nearestTownText}/>
                            )}
                            <RecordReadonlyField label={t("record.locality")} content={localRecord.locality}/>
                            {!isVascular && (
                                <RecordReadonlyField label={t("record.localityExtra")}
                                                     content={localRecord.localityExtra}/>
                            )}
                            <RecordReadonlyField label={t("record.comment")} content={localRecord.comment}/>
                            <RecordReadonlyField label={t("record.altitudeMin")}
                                                 content={localRecord?.altitudeMin?.toString() ?? ''}/>
                            <RecordReadonlyField label={t("record.altitudeMax")}
                                                 content={localRecord?.altitudeMax?.toString() ?? ''}/>
                            <RecordReadonlyField label={t("record.date")} content={localRecord.dateIso}/>
                            <RecordReadonlyField label={t("record.collector")}
                                                 content={localRecord.recordAuthors.map(s => s.authorFullName ?? '').join("; ")}/>
                            <div className="d-flex flex-wrap gap-1">
                                {localRecord.recordAuthors.length === 0 ? (
                                    <span className="text-muted">{t("common.multiValueEdit.none")}</span>
                                ) : (
                                    localRecord.recordAuthors.map((author: any) => (
                                        <span key={author.id} className="badge bg-secondary">
                                            {author.authorFullName}
                                        </span>
                                    ))
                                )}
                            </div>
                        </>}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    )
        ;
}

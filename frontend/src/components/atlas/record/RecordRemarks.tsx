import {Card, Col, Row} from "react-bootstrap";
import {useLayoutEffect, useRef, useState, useEffect} from "react";
import {useTranslation} from "react-i18next";
import type { RecordPladiasFull } from '@/models/RecordPladiasFull';
import RecordReadonlyField from "@/components/atlas/record/RecordReadonlyField.tsx";
import RecordInlineField from "@/components/atlas/record/RecordInlineField.tsx";
import MultiSelectEdit from "@/components/atlas/record/MultiSelectEdit.tsx";
import type {MultiValueOption} from "@/models/MultiValueOption";
import {useRecordPermissions} from "@/components/atlas/record/hooks/useRecordPermissions.ts";

interface RecordRemarksProps {
    record: RecordPladiasFull;
    onFieldUpdated?: (newTimestamp: number) => void;
}


export default function RecordRemarks({record, onFieldUpdated}: RecordRemarksProps) {
    const {t} = useTranslation();
    const scrollRef = useRef<number>(0);

    // Local state to track record updates (timestamp changes from backend auto-propagation)
    const [localRecord, setLocalRecord] = useState<RecordPladiasFull>(record);

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

    // Scroll position preservation on re-render
    useLayoutEffect(() => {
        // Save current scroll position before potential re-render
        scrollRef.current = window.scrollY;
    }, [localRecord]);

    // Restore scroll position after re-render
    useLayoutEffect(() => {
        window.scrollTo(0, scrollRef.current);
    }, [localRecord]);

    const {canEdit} = useRecordPermissions(localRecord);

    const hasRemarks = [
        localRecord.remarkExcerption,
        localRecord.remarkOther,
        localRecord.remarkDoubt,
        localRecord.environment,
        localRecord.detrev,
    ].some(value => value?.trim());

    // Handler for SOURCE field update - only updates local state, no API call
    const handleSourceSave = (data: { updatedValue: any, newTimestamp: number }) => {
        setLocalRecord((prev: RecordPladiasFull) => ({
            ...prev,
            source: data.updatedValue,
            lastEditTimestampNum: data.newTimestamp
        }));
        // Propagate timestamp update to parent
        onFieldUpdated?.(data.newTimestamp);
    };

    // Handler for ORIGINALID field update - only updates local state, no API call
    const handleOriginalIdSave = (data: { updatedValue: any, newTimestamp: number }) => {
        setLocalRecord((prev: RecordPladiasFull) => ({
            ...prev,
            originalId: data.updatedValue,
            lastEditTimestampNum: data.newTimestamp
        }));
        // Propagate timestamp update to parent
        onFieldUpdated?.(data.newTimestamp);
    };

    return (
        <Row className="mb-3">
            <Col>
                <Card>
                    <Card.Header>
                        <strong>Doplňkové informace</strong>
                    </Card.Header>
                    <Card.Body>
                        <h5>Příznaky pro mapu</h5>
                        <RecordReadonlyField label={t("record.includedInMap")}
                                             content={
                                                 localRecord.includedInMap
                                                     ? <i className="bi bi-check text-success"></i>
                                                     : <i className="bi bi-x text-danger"></i>
                                             }/>
                        <RecordReadonlyField label={t("record.herbariumQuality")}
                                             content={localRecord.herbariumQuality
                                                 ? <i className="bi bi-check text-success"></i>
                                                 : <i className="bi bi-x text-danger"></i>
                                             }/>
                        <RecordReadonlyField label={t("record.originality")}
                                             content={localRecord.originalityStatusName}/>
                        <Row className="align-items-center mb-1">
                            <Col sm={3} className="text-muted small">
                                {t("record.validationStatus")}
                            </Col>
                            <Col sm={9}>
                                <span style={{color: localRecord.validationStatusColor || '#808080'}}
                                      className="ms-2">{localRecord.validationStatusDescription || '-'}</span>
                            </Col>
                        </Row>

                        <h5>Zdroje</h5>
                        {canEdit ? (
                            <RecordInlineField
                                label={t("record.source")}
                                recordId={localRecord.id}
                                field="SOURCE"
                                value={localRecord.source}
                                onUpdated={handleSourceSave}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                        ) : (
                            localRecord.source?.trim() && (
                                <RecordReadonlyField label={t("record.source")}
                                                     content={localRecord.source}/>
                            )
                        )}
                        <RecordReadonlyField label={t("record.revisedHerbarium")}
                                             content={localRecord.herbariumQuality
                                                 ? <i className="bi bi-check text-success"></i>
                                                 : <i className="bi bi-x text-danger"></i>}/>
                        {localRecord.mapSquares.length > 0 && (
                            <RecordReadonlyField label={t("record.squares")}
                                                 content={localRecord.mapSquares.map((s: {
                                                     code: string
                                                 }) => s.code).join(", ")}/>
                        )}
                        {canEdit ? (
                            <MultiSelectEdit
                                label={t("record.herbariums")}
                                recordId={localRecord.id}
                                currentValue={localRecord.herbariums.map((h): MultiValueOption => ({
                                    id: h.id,
                                    name: h.name,
                                    label: h.label
                                }))}
                                endpoint={`/api/react/atlas/record/${localRecord.id}/unassignedHerbaria`}
                                addKey="ADDHERBARIUM"
                                deleteKey="DELETEHERBARIUM"
                                onUpdated={(data) => {
                                    setLocalRecord((prev: RecordPladiasFull) => {
                                        const newHerbariums = data.updatedValue.map((opt): any => ({
                                            id: opt.id,
                                            name: opt.name,
                                            abbrev: opt.label || null,
                                            abbrevExplanation: null
                                        }));
                                        return {
                                            ...prev,
                                            herbariums: newHerbariums,
                                            lastEditTimestampNum: data.newTimestamp
                                        };
                                    });
                                    onFieldUpdated?.(data.newTimestamp);
                                }}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                        ) : (
                            <div className="d-flex flex-wrap gap-1">
                                {localRecord.herbariums.length === 0 ? (
                                    <span className="text-muted">{t("common.multiValueEdit.none")}</span>
                                ) : (
                                    localRecord.herbariums.map((herb: any) => (
                                        <span key={herb.id} className="badge bg-secondary">
                                            {herb.name}
                                        </span>
                                    ))
                                )}
                            </div>
                        )}
                        {canEdit ? (
                            <RecordInlineField
                                label={t("record.originalId")}
                                recordId={localRecord.id}
                                field="ORIGINALID"
                                value={localRecord.originalId?.toString() ?? ''}
                                onUpdated={handleOriginalIdSave}
                                lastEditTimestampNum={localRecord.lastEditTimestampNum || 0}
                            />
                        ) : (
                            localRecord.originalId?.trim() && (
                                <RecordReadonlyField label={t("record.originalId")}
                                                     content={localRecord.originalId}/>
                            )
                        )}
                        <h5>Technické info</h5>
                        <RecordReadonlyField label={t("record.batch")}
                                             content={localRecord.batch.id.toString()}/>
                        <RecordReadonlyField label="ID" content={localRecord.id.toString()}/>
                        <RecordReadonlyField label={t("record.uploaded")}
                                             content={localRecord.batch.authorName + " " + localRecord.batch.createTimestamp}/>
                        <RecordReadonlyField label={t("record.phytochorionComputed")}
                                             content={localRecord.isPhytochorionComputed
                                                 ? <i className="bi bi-check text-success"></i>
                                                 : <i className="bi bi-x text-danger"></i>}/>
                        <RecordReadonlyField label={t("record.altitudeAproximate")}
                                             content={localRecord.altitudeApproximation
                                                 ? <i className="bi bi-check text-success"></i>
                                                 : <i className="bi bi-x text-danger"></i>}/>

                        <RecordReadonlyField label={t("record.origin")}
                                             content={localRecord.projectName + " | " + localRecord.institutionName}/>
                        <RecordReadonlyField label={t("record.license")} content={localRecord.licenseName}/>
                        {hasRemarks && (
                            <>
                                <h5>{t("record.remarks")}</h5>
                                {localRecord.remarkExcerption?.trim() && (
                                    <RecordReadonlyField label={t("record.remarkExcerption")}
                                                         content={localRecord.remarkExcerption}/>
                                )}
                                {localRecord.remarkOther?.trim() && (
                                    <RecordReadonlyField label={t("record.remarkOther")}
                                                         content={localRecord.remarkOther}/>
                                )}
                                {localRecord.remarkDoubt?.trim() && (
                                    <RecordReadonlyField label={t("record.remarkDoubt")}
                                                         content={localRecord.remarkDoubt}/>
                                )}
                                {localRecord.environment?.trim() && (
                                    <RecordReadonlyField label={t("record.environment")}
                                                         content={localRecord.environment}/>
                                )}
                                {localRecord.detrev?.trim() && (
                                    <RecordReadonlyField label={t("record.detrev")}
                                                         content={localRecord.detrev}/>
                                )}
                            </>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}
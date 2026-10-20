import {Row, Col, Container, Spinner, Alert, Button} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {useParams} from "react-router-dom";
import {useEffect, useState, useCallback, useRef} from "react";
import {
    RecordLocation,
    RecordRemarks,
    RecordComments,
    RecordMap, RecordHistory,
    RecordFloristic,
} from "@/components/atlas/record";
import type { RecordPladiasFull, ReverseGeocodingResponse } from "@/models";
import {getRecordFull, moveRecordCoordinates} from "@/services/recordApi";
import {apiErrorMessage} from "@/services/apiClient";

interface ProposedLocation {
    coordinates: [number, number];
    geocodeData: ReverseGeocodingResponse;
    gpsPrecision: number;
}

export default function Record() {
    const {recordId} = useParams<{ recordId: string }>();
    const {t} = useTranslation();
    const [record, setRecord] = useState<RecordPladiasFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [proposedLocation, setProposedLocation] = useState<ProposedLocation | undefined>(undefined);
    const [moving, setMoving] = useState(false);
    const [moveError, setMoveError] = useState<string | null>(null);
    
    // Ref to always access the latest record value without closure issues
    const recordRef = useRef<RecordPladiasFull | null>(null);

    usePageTitle(`${t("record.titles.detail")} ${recordId ? ` ${recordId}` : ''}`);

    useEffect(() => {
        if (!recordId) {
            setError(t("record.noRecordId"));
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        getRecordFull(parseInt(recordId))
            .then((data) => {
                setRecord(data);
            })
            .catch((err) => {
                setError(apiErrorMessage(err, t("record.loadFailed")));
            })
            .finally(() => {
                setLoading(false);
            });
    }, [recordId, t]);

    // Sync ref with record state whenever it changes
    useEffect(() => {
        recordRef.current = record;
    }, [record]);

    // Handle field updates from child components - update timestamp for conflict detection
    const handleFieldUpdated = useCallback((newTimestamp?: number) => {
        if (newTimestamp && recordRef.current) {
            setRecord(prev => prev ? ({
                ...prev,
                lastEditTimestampNum: newTimestamp
            }) : null);
        }
    }, []);

    const handleReverseGeocode = useCallback((lat: number, lng: number, data: ReverseGeocodingResponse) => {
        setProposedLocation({
            coordinates: [lat, lng],
            geocodeData: data,
            gpsPrecision: 100,
        });
    }, []);

    const handleConfirmMove = async () => {
        const currentRecord = recordRef.current;
        if (!proposedLocation || !currentRecord) {
            return;
        }

        setMoving(true);
        setMoveError(null);

        try {
            await moveRecordCoordinates(
                currentRecord.id,
                proposedLocation.coordinates[0],
                proposedLocation.coordinates[1],
                proposedLocation.gpsPrecision,
                currentRecord.lastEditTimestampNum || 0,
            );

            // Reload the page to show updated data
            window.location.reload();
        } catch (err) {
            setMoveError(apiErrorMessage(err, t("record.moveFailed")));
            setMoving(false);
        }
    };

    const handleCancelMove = () => {
        setProposedLocation(undefined);
        setMoveError(null);
    };

    if (loading) {
        return (
            <Container className="py-4">
                <Row className="justify-content-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">{t("common.loading")}</span>
                    </Spinner>
                </Row>
            </Container>
        );
    }

    if (error || !record) {
        return (
            <Container className="py-4">
                <Row>
                    <Col>
                        <Alert variant="danger">
                            {error || t("record.notFound")}
                        </Alert>
                    </Col>
                </Row>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <Row className="mb-4">
                <Col sm={12} md={12} lg={8}>
                    <Row>
                        <Col sm={12} md={6} lg={6}>
                            <RecordMap 
                                record={record} 
                                onLocationSelectWithGeocode={handleReverseGeocode}
                                hasProposedLocation={proposedLocation !== undefined}
                            />
                        </Col>
                        <Col sm={12} md={6} lg={6}>
                            <RecordFloristic record={record} onFieldUpdated={handleFieldUpdated}/>
                        </Col>
                        <Col sm={12} md={12} lg={12}>
                            <RecordLocation 
                                record={record} 
                                proposedLocation={proposedLocation}
                            />
                        </Col>
                        {proposedLocation && (
                            <Col sm={12} md={12} lg={12}>
                                <div className="p-3 bg-light border rounded">
                                    <div className="d-flex flex-wrap align-items-center gap-3">
                                        <div>
                                            <strong>{t("record.newPosition")}: </strong>
                                            {proposedLocation.coordinates[0].toFixed(6)}, {proposedLocation.coordinates[1].toFixed(6)}
                                        </div>
                                        <div>
                                            <label htmlFor="gpsPrecision" className="form-label mb-0 me-2">
                                                GPS precision (m):
                                            </label>
                                            <input
                                                type="number"
                                                id="gpsPrecision"
                                                className="form-control form-control-sm d-inline-block"
                                                style={{width: '100px'}}
                                                value={proposedLocation.gpsPrecision}
                                                onChange={(e) => setProposedLocation({
                                                    ...proposedLocation,
                                                    gpsPrecision: parseInt(e.target.value) || 0,
                                                })}
                                                min={0}
                                                required
                                            />
                                        </div>
                                        <div className="ms-auto d-flex gap-2">
                                            {moveError && <span className="text-danger me-2">{moveError}</span>}
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={handleConfirmMove}
                                                disabled={moving}
                                            >
                                                {moving ? '...' : t("common.yes")}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleCancelMove}
                                                disabled={moving}
                                            >
                                                {t("common.no")}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        )}
                    </Row>
                </Col>
                <Col sm={12} md={12} lg={4}>
                    <RecordRemarks record={record} onFieldUpdated={handleFieldUpdated}/>
                </Col>
            </Row>
            <Row className="mb-4">
                <RecordComments recordId={record.id} canResolveComments={record.canResolveComments ?? false}/>
                <RecordHistory recordId={record.id}/>
            </Row>
        </Container>
    );
}
import {Row, Col, Container, Spinner, Button} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {useParams} from "react-router-dom";
import {useCallback, useEffect, useState} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {
    RecordLocation,
    RecordRemarks,
    RecordComments,
    RecordMap, RecordHistory,
    RecordFloristic,
} from "@/components/atlas/record";
import type { RecordPladiasFull, ReverseGeocodingResponse } from "@/models";
import {getRecordFull, moveRecordCoordinates} from "@/services/recordApi";
import {notifyApiError, pushNotification} from "@/stores/notificationStore";

interface ProposedLocation {
    coordinates: [number, number];
    geocodeData: ReverseGeocodingResponse;
    gpsPrecision: number;
}

export default function Record() {
    const {recordId} = useParams<{ recordId: string }>();
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const [proposedLocation, setProposedLocation] = useState<ProposedLocation | undefined>(undefined);
    const [moving, setMoving] = useState(false);

    usePageTitle(`${t("record.titles.detail")} ${recordId ? ` ${recordId}` : ''}`);

    // záznam se všemi relacemi – bez cache (sekce J), načtení při mountu
    const {data: record, isPending: loading, error} = useQuery({
        queryKey: ["recordFull", recordId],
        queryFn: () => getRecordFull(parseInt(recordId!, 10)),
        enabled: recordId !== undefined,
    });
    // chyby načtení – globální notifikace; render pak jen skryje obsah stránky
    useEffect(() => {
        if (!recordId) {
            pushNotification({type: "danger", message: t("record.noRecordId")});
        } else if (error) {
            notifyApiError(error, t("record.loadFailed"));
        }
    }, [recordId, error, t]);

    // Handle field updates from child components - update timestamp for conflict detection
    const handleFieldUpdated = useCallback((newTimestamp?: number) => {
        if (newTimestamp && recordId) {
            queryClient.setQueryData<RecordPladiasFull>(["recordFull", recordId], prev => prev ? ({
                ...prev,
                lastEditTimestampNum: newTimestamp
            }) : prev);
        }
    }, [queryClient, recordId]);

    const handleReverseGeocode = useCallback((lat: number, lng: number, data: ReverseGeocodingResponse) => {
        setProposedLocation({
            coordinates: [lat, lng],
            geocodeData: data,
            gpsPrecision: 100,
        });
    }, []);

    const handleConfirmMove = async () => {
        if (!proposedLocation || !record) {
            return;
        }

        setMoving(true);

        try {
            await moveRecordCoordinates(
                record.id,
                proposedLocation.coordinates[0],
                proposedLocation.coordinates[1],
                proposedLocation.gpsPrecision,
                record.lastEditTimestampNum || 0,
            );

            // Reload the page to show updated data
            window.location.reload();
        } catch (err) {
            notifyApiError(err, t("record.moveFailed"));
            setMoving(false);
        }
    };

    const handleCancelMove = () => {
        setProposedLocation(undefined);
    };

    if (!recordId) {
        return null;
    }

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

    if (!record) {
        return null;
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
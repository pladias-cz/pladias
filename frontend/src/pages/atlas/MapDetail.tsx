import { Container, Row, Col } from "react-bootstrap";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import type { RecordPladias } from "@/models";
import type {RecordsByProject, RecordsByProjectMinimal} from "@/models/AtlasRecords";
import type { TaxonId } from "@/models/TaxonId";
import {
    getNearbyExternalRecords,
    getNearbyPladiasRecords,
    getSquareExternalRecords,
    getSquarePladiasRecords,
} from "@/services/atlasApi";
import {getTaxon} from "@/services/taxonApi";
import {notifyApiError} from "@/stores/notificationStore";
import { MapComponent } from "@/components/atlas/mapDetail/MapComponent";
import { InfoPanel } from "@/components/atlas/mapDetail/InfoPanel";
import RichTextMessage from "@/components/RichTextMessage";

export default function MapDetail() {
    const { t } = useTranslation();
    const { taxonId, squareId } = useParams<{ taxonId: string; squareId: string }>();
    const [taxon, setTaxon] = useState<TaxonId | null>(null);
    // Two separate states: minimal data for map, full data for table
    const [mapRecords, setMapRecords] = useState<RecordsByProjectMinimal>({ pladias: [], gbif: [], inaturalist: [] });
    const [tableRecords, setTableRecords] = useState<RecordsByProject>({ pladias: [], gbif: [], inaturalist: [] });
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [highlightedRecordId, setHighlightedRecordId] = useState<number | null>(null);
    const [centerOnRecord, setCenterOnRecord] = useState<{ latitude: number; longitude: number } | null>(null);
    const tableScrollFnsRef = useRef<{ pladias?: ((recordId: number) => void); gbif?: ((recordId: number) => void); inaturalist?: ((recordId: number) => void) }>({});
    const hoverLockRef = useRef<{ recordId: number | null; timeoutId: NodeJS.Timeout | null }>({ recordId: null, timeoutId: null });

    usePageTitle(t("atlas.mapDetail.title"));

    // Handle hover from map - triggers scroll in table with debounce
    const handleMapRecordHover = (recordId: number | null) => {
        // If we have a locked highlight, ignore new hovers until timeout expires
        if (hoverLockRef.current.timeoutId && hoverLockRef.current.recordId !== null) {
            return;
        }

        setHighlightedRecordId(recordId);

        if (recordId !== null) {
            // Lock this highlight for 800ms to allow user to move to table
            hoverLockRef.current.recordId = recordId;
            hoverLockRef.current.timeoutId = setTimeout(() => {
                hoverLockRef.current.recordId = null;
                hoverLockRef.current.timeoutId = null;
            }, 1800);

            // Find which project this record belongs to and scroll to it
            // Use tableRecords for scroll lookup since that's what the table displays
            const pladiasRecord = tableRecords.pladias.find(r => r.id === recordId);
            if (pladiasRecord && tableScrollFnsRef.current.pladias) {
                tableScrollFnsRef.current.pladias(recordId);
            } else {
                // Check GBIF/iNaturalist records
                const gbifInatRecords = [...tableRecords.gbif, ...tableRecords.inaturalist];
                const record = gbifInatRecords.find(r => r.id === recordId);
                if (record && tableScrollFnsRef.current[record.project as keyof typeof tableScrollFnsRef.current]) {
                    const scrollFn = tableScrollFnsRef.current[record.project as keyof typeof tableScrollFnsRef.current];
                    if (scrollFn) {
                        scrollFn(recordId);
                    }
                }
            }
        } else {
            // Mouse left all markers - clear immediately
            if (hoverLockRef.current.timeoutId) {
                clearTimeout(hoverLockRef.current.timeoutId);
                hoverLockRef.current.timeoutId = null;
            }
            hoverLockRef.current.recordId = null;
        }
    };

    // Fetch taxon info
    useEffect(() => {
        if (taxonId) {
            const id = parseInt(taxonId, 10);
            if (!isNaN(id)) {
                getTaxon(id)
                    .then(taxon => {
                        setTaxon({id: taxon.id, nameLat: taxon.nameLat, nameHtml: taxon.nameHtml});
                    })
                    .catch(e => notifyApiError(e, t("atlas.taxonLoadFailed")));
            }
        }
    }, [taxonId, t]);

    // Fetch records for all three projects - minimal data for map, full data for table
    useEffect(() => {
        if (!taxonId || !squareId) {
            setMapRecords({ pladias: [], gbif: [], inaturalist: [] });
            setTableRecords({ pladias: [], gbif: [], inaturalist: [] });
            return;
        }

        const id = parseInt(taxonId, 10);
        if (isNaN(id)) {
            return;
        }

        setRecordsLoading(true);

        // Fetch both map and table data in parallel
        // (map: surrounding squares, minimal DTOs; table: current square, full data)
        Promise.all([
            getNearbyPladiasRecords(squareId, id),
            getNearbyExternalRecords(squareId, id, "gbif"),
            getNearbyExternalRecords(squareId, id, "inaturalist"),
            getSquarePladiasRecords(squareId, id),
            getSquareExternalRecords(squareId, id, "gbif"),
            getSquareExternalRecords(squareId, id, "inaturalist"),
        ])
            .then(([
                mapPladias, mapGbif, mapInaturalist,
                tablePladias, tableGbif, tableInaturalist
            ]) => {
                setMapRecords({ pladias: mapPladias, gbif: mapGbif, inaturalist: mapInaturalist });
                setTableRecords({ pladias: tablePladias, gbif: tableGbif, inaturalist: tableInaturalist });
            })
            .catch(e => {
                notifyApiError(e, t("atlas.mapDetail.loadRecordsFailed"));
                setMapRecords({ pladias: [], gbif: [], inaturalist: [] });
                setTableRecords({ pladias: [], gbif: [], inaturalist: [] });
            })
            .finally(() => {
                setRecordsLoading(false);
            });
    }, [taxonId, squareId, t]);

    // Handle record update from quick actions (validation status, etc.)
    const handleRecordUpdated = useCallback((updatedRecord: RecordPladias) => {
        // Update both map and table records
        setTableRecords(prev => ({
            ...prev,
            pladias: prev.pladias.map(r => r.id === updatedRecord.id ? updatedRecord : r)
        }));
        // Also update map records with minimal data
        setMapRecords(prev => ({
            ...prev,
            pladias: prev.pladias.map(r => r.id === updatedRecord.id ? {
                id: updatedRecord.id,
                latitude: updatedRecord.latitude,
                longitude: updatedRecord.longitude,
                gpsPrecision: updatedRecord.gpsPrecision,
                year: updatedRecord.year,
                recordedBy: updatedRecord.recordAuthorsNames,
                validationStatusId: updatedRecord.validationStatusId,
                validationStatusColor: updatedRecord.validationStatusColor,
                computedSquareCode: updatedRecord.computedSquareCode
            } : r)
        }));
    }, []);

    if (!taxonId || !squareId) {
        return null;
    }

    return (
        <Container fluid className="px-0">
            <Row className="g-0" style={{ height: 'calc(90vh - 56px)' }}>
                <Col md={12} lg={5} xl={4} className="h-100">
                    <h5>
                        <RichTextMessage html={taxon?.nameHtml}/>
                        <span className="text-muted small"> ID: {taxonId}</span>
                        <span className="text-muted small ms-2">
                                    ({t("atlas.mapDetail.square")} {squareId})
                                </span>
                        <a href={`/atlas/mapMain/${taxonId}`} className="small ms-2 fs-5">
                             zpět na hlavní mapu
                        </a>
                    </h5>
                    <MapComponent

                        taxonId={taxon?.id ?? undefined}
                        squareId={squareId}
                        records={mapRecords}
                        highlightedRecordId={highlightedRecordId}
                        onRecordHover={handleMapRecordHover}
                        centerOnRecord={centerOnRecord}
                    />
                </Col>
                <Col lg={7} xl={8} className="h-100 overflow-hidden">
                    <div className="h-100 p-3">
                        <InfoPanel
                            taxonName={taxon?.nameHtml}
                            taxonId={taxon?.id ?? undefined}
                            records={tableRecords}
                            recordsLoading={recordsLoading}
                            highlightedRecordId={highlightedRecordId}
                            onRecordHover={setHighlightedRecordId}
                            onRecordCenter={(record) => {
                                if (record.latitude !== null && record.longitude !== null) {
                                    setCenterOnRecord({ latitude: record.latitude, longitude: record.longitude });
                                }
                            }}
                            currentSquareCode={squareId}
                            registerScrollFns={{
                                pladias: (scrollFn) => { tableScrollFnsRef.current.pladias = scrollFn; },
                                gbif: (scrollFn) => { tableScrollFnsRef.current.gbif = scrollFn; },
                                inaturalist: (scrollFn) => { tableScrollFnsRef.current.inaturalist = scrollFn; }
                            }}
                            onRecordUpdated={handleRecordUpdated}
                        />
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

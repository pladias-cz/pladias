import { Container, Row, Col } from "react-bootstrap";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import type { TaxonId } from "@/models/TaxonId";
import type { RecordPladias } from "@/models";
import { MapComponent } from "@/components/atlas/mapDetail/MapComponent";
import { InfoPanel } from "@/components/atlas/mapDetail/InfoPanel";

/**
 * Project type enum
 */
export type ProjectType = 'pladias' | 'gbif' | 'inaturalist';

/**
 * GBIF/iNaturalist record - minimal data from backend
 * Matches RecordGbifMinimalDto.java
 */
export interface RecordGbifMinimal {
    id: number;
    latitude: number;
    longitude: number;
    gpsPrecision: number | null;
    year: number | null;
    recordedBy: string | null;
    institutionCode: string | null;
    validationStatusColor: string | null;
    quadrantLetter: string | null;
    squareCode: string | null;
    computedSquareCode: string | null;
    project: 'gbif' | 'inaturalist';
}

/**
 * Union type for all record types that have a project property
 */
export type RecordWithProject = RecordGbifMinimal;

/**
 * All record types including PLADIAS (which doesn't have project field but is handled separately)
 */
export type AnyRecord = RecordPladias | RecordGbifMinimal;

export interface RecordComment {
    id: number;
    authorId: number | null;
    authorName: string | null;
    message: string | null;
    createTimestamp: string | null;
    resolved: boolean | null;
    deleted: boolean | null;
}

export interface HerbariumItem {
    id: number;
    name: string | null;
    abbrev: string | null;
    abbrevExplanation: string | null;
}

export interface RecordsByProject {
    pladias: RecordPladias[];
    gbif: RecordGbifMinimal[];
    inaturalist: RecordGbifMinimal[];
}

export default function MapDetail() {
    const { t } = useTranslation();
    const { taxonId, squareId } = useParams<{ taxonId: string; squareId: string }>();
    const [taxon, setTaxon] = useState<TaxonId | null>(null);
    const [records, setRecords] = useState<RecordsByProject>({ pladias: [], gbif: [], inaturalist: [] });
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
            // Check PLADIAS records first
            const pladiasRecord = records.pladias.find(r => r.id === recordId);
            if (pladiasRecord && tableScrollFnsRef.current.pladias) {
                tableScrollFnsRef.current.pladias(recordId);
            } else {
                // Check GBIF/iNaturalist records
                const gbifInatRecords = [...records.gbif, ...records.inaturalist];
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
                fetch(`/api/react/taxon/${id}`)
                    .then(res => {
                        if (!res.ok) throw new Error('Taxon not found');
                        return res.json();
                    })
                    .then(result => {
                        if (result.data) {
                            setTaxon({
                                id: result.data.id,
                                nameLat: result.data.nameLat,
                                nameHtml: result.data.nameHtml
                            });
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [taxonId]);

    // Fetch records for all three projects
    useEffect(() => {
        if (!taxonId || !squareId) {
            setRecords({ pladias: [], gbif: [], inaturalist: [] });
            return;
        }

        const id = parseInt(taxonId, 10);
        if (isNaN(id)) {
            return;
        }

        setRecordsLoading(true);
        
        const fetchPladiasRecords = async (): Promise<RecordPladias[]> => {
            const response = await fetch(`/api/react/atlas/records/${squareId}/${taxonId}/pladias`);
            if (!response.ok) throw new Error('Failed to fetch pladias records');
            const result = await response.json();
            const data = result.data && Array.isArray(result.data) ? result.data : [];
            // Convert lastEditTimestamp string to lastEditTimestampNum for conflict detection
            return data.map((record: RecordPladias) => ({
                ...record,
                lastEditTimestampNum: record.lastEditTimestamp 
                    ? new Date(record.lastEditTimestamp).getTime() 
                    : 0
            }));
        };

        const fetchGbifRecords = async (): Promise<RecordGbifMinimal[]> => {
            const response = await fetch(`/api/react/atlas/records/${squareId}/${taxonId}/gbif`);
            if (!response.ok) throw new Error('Failed to fetch gbif records');
            const result = await response.json();
            const data = result.data && Array.isArray(result.data) ? result.data : [];
            return data.map((record: RecordGbifMinimal) => ({ ...record, project: 'gbif' as const }));
        };

        const fetchInaturalistRecords = async (): Promise<RecordGbifMinimal[]> => {
            const response = await fetch(`/api/react/atlas/records/${squareId}/${taxonId}/inaturalist`);
            if (!response.ok) throw new Error('Failed to fetch inaturalist records');
            const result = await response.json();
            const data = result.data && Array.isArray(result.data) ? result.data : [];
            return data.map((record: RecordGbifMinimal) => ({ ...record, project: 'inaturalist' as const }));
        };

        Promise.all([
            fetchPladiasRecords(),
            fetchGbifRecords(),
            fetchInaturalistRecords()
        ])
            .then(([pladias, gbif, inaturalist]) => {
                setRecords({ pladias, gbif, inaturalist });
            })
            .catch(() => {
                setRecords({ pladias: [], gbif: [], inaturalist: [] });
            })
            .finally(() => {
                setRecordsLoading(false);
            });
    }, [taxonId, squareId]);

    // Handle record update from quick actions (validation status, etc.)
    const handleRecordUpdated = useCallback((updatedRecord: RecordPladias) => {
        setRecords(prev => ({
            ...prev,
            pladias: prev.pladias.map(r => r.id === updatedRecord.id ? updatedRecord : r)
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
                        <span dangerouslySetInnerHTML={{__html: taxon?.nameHtml  ?? "" }} />
                        <span className="text-muted small"> ID: {taxonId}</span>
                        <span className="text-muted small ms-2">
                                    ({t("atlas.mapDetail.square")} {squareId})
                                </span>
                        <a href={`/react/atlas/mapMain/${taxonId}`} className="small ms-2 fs-5">
                             zpět na hlavní mapu
                        </a>
                    </h5>
                    <MapComponent

                        taxonId={taxon?.id ?? undefined} 
                        squareId={squareId}
                        records={records}
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
                            records={records}
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

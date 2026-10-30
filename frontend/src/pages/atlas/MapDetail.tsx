import {Container, Row, Col} from 'react-bootstrap';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';
import {useParams} from 'react-router-dom';
import {useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import type {RecordPladias} from '@/models';
import type {RecordsByProject, RecordsByProjectMinimal} from '@/models/AtlasRecords';
import {
    getNearbyExternalRecords,
    getNearbyPladiasRecords,
    getSquareExternalRecords,
    getSquarePladiasRecords,
} from '@/services/atlasApi';
import {getTaxon} from '@/services/taxonApi';
import {notifyApiError} from '@/stores/notificationStore';
import {MapComponent} from '@/components/atlas/mapDetail/MapComponent';
import {InfoPanel} from '@/components/atlas/mapDetail/InfoPanel';
import RichTextMessage from '@/components/RichTextMessage';
import {useRecordSourceVisibility} from '@/components/atlas/mapDetail/hooks/useRecordSourceVisibility';
import {filterRecordsByVisibility} from '@/components/atlas/mapDetail/recordSources';

/** Data mapy (minimal) a tabulky (full) kvadrantu – jeden query, jeden loading. */
interface SquareRecords {
    mapRecords: RecordsByProjectMinimal;
    tableRecords: RecordsByProject;
}

const EMPTY_RECORDS: RecordsByProjectMinimal = {pladias: [], gbif: [], inaturalist: []};

export default function MapDetail() {
    const {t} = useTranslation();
    const {taxonId, squareId} = useParams<{ taxonId: string; squareId: string }>();
    const queryClient = useQueryClient();
    const [highlightedRecordId, setHighlightedRecordId] = useState<number | null>(null);
    const [centerOnRecord, setCenterOnRecord] = useState<{ latitude: number; longitude: number } | null>(null);
    const tableScrollFnsRef = useRef<{
        pladias?: ((recordId: number) => void);
        gbif?: ((recordId: number) => void);
        inaturalist?: ((recordId: number) => void)
    }>({});
    const hoverLockRef = useRef<{ recordId: number | null; timeoutId: ReturnType<typeof setTimeout> | null }>({
        recordId: null,
        timeoutId: null
    });
    // viditelnost skupin záznamů na mapě (checkboxy v InfoPanelu), perzistováno v user settings
    const {visibleProjects, toggleProjectVisibility} = useRecordSourceVisibility();

    usePageTitle(t('atlas.mapDetail.title'));

    const id = useMemo(() => {
        const parsed = parseInt(taxonId ?? '', 10);
        return isNaN(parsed) ? null : parsed;
    }, [taxonId]);

    // taxon pro hlávčku – bez cache (sekce J), načtení při mountu
    const {data: taxon, error: taxonError} = useQuery({
        queryKey: ['taxon', id],
        queryFn: () => getTaxon(id!),
        enabled: id !== null,
    });

    useEffect(() => {
        if (taxonError) {
            notifyApiError(taxonError, t('atlas.taxonLoadFailed'));
        }
    }, [taxonError, t]);

    // záznamy všech tří projektů – minimální data pro mapu (okolní kvadranty)
    // a plná pro tabulku (aktuální kvadrant) se načítají společně jako dřív
    const recordsKey = useMemo(() => ['squareRecords', squareId, id] as const, [squareId, id]);
    const recordsQuery = useQuery({
        queryKey: recordsKey,
        queryFn: async (): Promise<SquareRecords> => {
            const [
                mapPladias, mapGbif, mapInaturalist,
                tablePladias, tableGbif, tableInaturalist
            ] = await Promise.all([
                getNearbyPladiasRecords(squareId!, id!),
                getNearbyExternalRecords(squareId!, id!, 'gbif'),
                getNearbyExternalRecords(squareId!, id!, 'inaturalist'),
                getSquarePladiasRecords(squareId!, id!),
                getSquareExternalRecords(squareId!, id!, 'gbif'),
                getSquareExternalRecords(squareId!, id!, 'inaturalist'),
            ]);
            return {
                mapRecords: {pladias: mapPladias, gbif: mapGbif, inaturalist: mapInaturalist},
                tableRecords: {pladias: tablePladias, gbif: tableGbif, inaturalist: tableInaturalist},
            };
        },
        enabled: id !== null && squareId !== undefined,
    });
    const mapRecords = recordsQuery.data?.mapRecords ?? EMPTY_RECORDS;
    const tableRecords = recordsQuery.data?.tableRecords ?? {pladias: [], gbif: [], inaturalist: []};
    const recordsLoading = recordsQuery.isPending;
    // markery na mapě odpovídají zaškrtnutým skupinám – tabulky zůstávají kompletní
    const visibleMapRecords = useMemo(
        () => filterRecordsByVisibility(mapRecords, visibleProjects),
        [mapRecords, visibleProjects],
    );

    useEffect(() => {
        if (recordsQuery.error) {
            notifyApiError(recordsQuery.error, t('atlas.mapDetail.loadRecordsFailed'));
        }
    }, [recordsQuery.error, t]);

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

    // Handle record update from quick actions (validation status, etc.)
    const handleRecordUpdated = useCallback((updatedRecord: RecordPladias) => {
        // Update both map and table records in the query cache
        queryClient.setQueryData<SquareRecords>(recordsKey, prev => {
            if (!prev) {
                return prev;
            }
            return {
                // Also update map records with minimal data
                mapRecords: {
                    ...prev.mapRecords,
                    pladias: prev.mapRecords.pladias.map(r => r.id === updatedRecord.id ? {
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
                },
                tableRecords: {
                    ...prev.tableRecords,
                    pladias: prev.tableRecords.pladias.map(r => r.id === updatedRecord.id ? updatedRecord : r)
                },
            };
        });
    }, [queryClient, recordsKey]);

    if (!taxonId || !squareId) {
        return null;
    }

    return (
        <Container fluid className="px-0">
            <Row className="g-0" style={{height: 'calc(90vh - 56px)'}}>
                <Col md={12} lg={5} xl={4} className="h-100">
                    <h5>
                        {/* ID taxonu jako hover title jména (dříve viditelný text). */}
                        <RichTextMessage html={taxon?.nameHtml} title={`ID: ${taxonId}`}/>
                        <span className="text-muted small ms-2">
                                    ({t('atlas.mapDetail.square')} {squareId})
                                </span>
                        <span className="small ms-2">
                        <a href={`/atlas/mapMain/${taxonId}`}>
                            {t('atlas.mapDetail.back2MainMap')}
                        </a>
                        </span>
                    </h5>
                    <MapComponent

                        taxonId={taxon?.id ?? undefined}
                        squareId={squareId}
                        records={visibleMapRecords}
                        highlightedRecordId={highlightedRecordId}
                        onRecordHover={handleMapRecordHover}
                        centerOnRecord={centerOnRecord}
                    />
                </Col>
                <Col lg={7} xl={8} className="h-100 overflow-hidden">
                    <div className="h-100 p-3">
                        <InfoPanel
                            records={tableRecords}
                            recordsLoading={recordsLoading}
                            highlightedRecordId={highlightedRecordId}
                            onRecordHover={setHighlightedRecordId}
                            onRecordCenter={(record) => {
                                if (record.latitude !== null && record.longitude !== null) {
                                    setCenterOnRecord({latitude: record.latitude, longitude: record.longitude});
                                }
                            }}
                            currentSquareCode={squareId}
                            registerScrollFns={{
                                pladias: (scrollFn) => {
                                    tableScrollFnsRef.current.pladias = scrollFn;
                                },
                                gbif: (scrollFn) => {
                                    tableScrollFnsRef.current.gbif = scrollFn;
                                },
                                inaturalist: (scrollFn) => {
                                    tableScrollFnsRef.current.inaturalist = scrollFn;
                                }
                            }}
                            onRecordUpdated={handleRecordUpdated}
                            visibleProjects={visibleProjects}
                            onToggleProjectVisibility={toggleProjectVisibility}
                        />
                    </div>
                </Col>
            </Row>
        </Container>
    );
}

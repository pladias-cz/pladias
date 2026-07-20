import type { RecordPladias } from '@/models';
import type {RecordGbifMinimal} from '@/pages/atlas/MapDetail';
import {useTranslation} from 'react-i18next';
import {PladiasRecordsTable} from './PladiasRecordsTable';
import {ExternalRecordsTable} from './ExternalRecordsTable';
import {Accordion} from "react-bootstrap";
import {useState} from "react";
import './InfoPanel.scss';

interface InfoPanelProps {
    taxonName?: string;
    taxonId?: number;
    records?: { pladias: RecordPladias[]; gbif: RecordGbifMinimal[]; inaturalist: RecordGbifMinimal[] };
    recordsLoading?: boolean;
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
    onRecordCenter?: (record: RecordPladias) => void;
    currentSquareCode?: string;
    registerScrollFns?: {
        pladias?: (scrollFn: (recordId: number) => void) => void;
        gbif?: (scrollFn: (recordId: number) => void) => void;
        inaturalist?: (scrollFn: (recordId: number) => void) => void
    };
    onRecordUpdated?: (record: RecordPladias) => void;
}

export function InfoPanel({
                              records = {pladias: [], gbif: [], inaturalist: []},
                              recordsLoading = false,
                              highlightedRecordId,
                              onRecordHover,
                              onRecordCenter,
                              registerScrollFns,
                              currentSquareCode,
                              onRecordUpdated
                          }: InfoPanelProps) {
    const {t} = useTranslation();

    // Filter PLADIAS records by square using computedSquareCode (based on exact coordinates)
    const filterPladiasBySquare = (recs: RecordPladias[]) => {
        if (!currentSquareCode) return recs;
        return recs.filter(record => record.computedSquareCode === currentSquareCode);
    };

    // Filter GBIF/iNaturalist records by computedSquareCode (based on exact coordinates)
    const filterMinimalBySquare = (recs: RecordGbifMinimal[]) => {
        if (!currentSquareCode) return recs;
        return recs.filter(record => record.computedSquareCode === currentSquareCode);
    };

    const pladiasRecords = filterPladiasBySquare(records.pladias || []);
    const gbifRecords = filterMinimalBySquare(records.gbif || []);
    const inaturalistRecords = filterMinimalBySquare(records.inaturalist || []);
    const [activeKey, setActiveKey] = useState<string>("0");

    return (
        <div className="d-flex flex-column h-100 overflow-hidden">
            <div className="flex-grow-1 overflow-auto">
                {recordsLoading && (
                    <div className="d-flex justify-content-center py-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}

                {!recordsLoading && (
                    <div className="h-100 d-flex flex-column">
                        <Accordion
                            activeKey={activeKey}
                            onSelect={(k) => typeof k === 'string' && setActiveKey(k)}
                            alwaysOpen={false}
                            className="fill-accordion"
                        >
                            <Accordion.Item eventKey="0">
                                <Accordion.Header>
                                    PLADIAS <span className="text-muted small ms-2">({pladiasRecords.length})</span>
                                </Accordion.Header>
                                <Accordion.Body>
                                    <PladiasRecordsTable
                                        key={`pladias-table-${currentSquareCode}`}
                                        records={pladiasRecords}
                                        highlightedRecordId={highlightedRecordId}
                                        onRecordHover={onRecordHover}
                                        onRecordCenter={onRecordCenter}
                                        registerScrollFn={registerScrollFns?.pladias}
                                        onRecordUpdated={onRecordUpdated}
                                    />
                                    {pladiasRecords.length === 0 && (
                                        <p className="text-muted small">{t("atlas.mapDetail.noRecords")}</p>
                                    )}
                                </Accordion.Body>
                            </Accordion.Item>

                            <Accordion.Item eventKey="1">
                                <Accordion.Header>
                                    GBIF <span className="text-muted small ms-2">({gbifRecords.length})</span>
                                </Accordion.Header>
                                <Accordion.Body>
                                    <ExternalRecordsTable
                                        key={`gbif-table-${currentSquareCode}`}
                                        records={gbifRecords}
                                        highlightedRecordId={highlightedRecordId}
                                        onRecordHover={onRecordHover}
                                        registerScrollFn={registerScrollFns?.gbif}
                                    />
                                </Accordion.Body>
                            </Accordion.Item>

                            <Accordion.Item eventKey="2">
                                <Accordion.Header>
                                    iNaturalist <span className="text-muted small ms-2">({inaturalistRecords.length})</span>
                                </Accordion.Header>
                                <Accordion.Body>
                                    <ExternalRecordsTable
                                        key={`inat-table-${currentSquareCode}`}
                                        records={inaturalistRecords}
                                        highlightedRecordId={highlightedRecordId}
                                        onRecordHover={onRecordHover}
                                        registerScrollFn={registerScrollFns?.inaturalist}
                                    />
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>
                    </div>

                )}
            </div>
        </div>
    );
}

export default InfoPanel;

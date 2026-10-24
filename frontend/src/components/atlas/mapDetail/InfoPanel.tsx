import type {RecordPladias} from '@/models';
import type {ProjectType, RecordsByProject} from '@/models/AtlasRecords';
import {useTranslation} from 'react-i18next';
import {PladiasRecordsTable} from './PladiasRecordsTable';
import {ExternalRecordsTable} from './ExternalRecordsTable';
import {Tabs, Tab} from 'react-bootstrap';
import {useState} from 'react';
import {RECORD_SOURCES, type RecordSourceVisibility} from './recordSources';
import {RecordSourceTabTitle} from './RecordSourceTabTitle';
import './InfoPanel.scss';

interface InfoPanelProps {
    records?: RecordsByProject;
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
    /** Viditelnost skupin záznamů na mapě (checkboxy v hlavičkách tabů). */
    visibleProjects: RecordSourceVisibility;
    onToggleProjectVisibility: (project: ProjectType) => void;
}

export function InfoPanel({
                              records = {pladias: [], gbif: [], inaturalist: []},
                              recordsLoading = false,
                              highlightedRecordId,
                              onRecordHover,
                              onRecordCenter,
                              registerScrollFns,
                              currentSquareCode,
                              onRecordUpdated,
                              visibleProjects,
                              onToggleProjectVisibility
                          }: InfoPanelProps) {
    const {t} = useTranslation();

    const [activeKey, setActiveKey] = useState<ProjectType>('pladias');

    return (
        <div className="d-flex flex-column h-100 overflow-hidden">
            {recordsLoading ? (
                <div className="d-flex justify-content-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                <div className="fill-tabs flex-grow-1">
                    {/* Tab musí být přímým potomkem Tabs – react-bootstrap čte jeho
                        props (eventKey/title) a obalující komponentu by převedl
                        na pouhý tab-pane bez hlavičky. */}
                    <Tabs
                        activeKey={activeKey}
                        onSelect={(k) => k && setActiveKey(k as ProjectType)}
                    >
                        {RECORD_SOURCES.map(source => (
                            <Tab
                                key={source.id}
                                eventKey={source.id}
                                title={(
                                    <RecordSourceTabTitle
                                        source={source}
                                        count={records[source.id].length}
                                        visible={visibleProjects[source.id]}
                                        onToggleVisibility={onToggleProjectVisibility}
                                    />
                                )}
                            >
                                {source.id === 'pladias' ? (
                                    <>
                                        <PladiasRecordsTable
                                            key={`pladias-table-${currentSquareCode}`}
                                            records={records.pladias}
                                            highlightedRecordId={highlightedRecordId}
                                            onRecordHover={onRecordHover}
                                            onRecordCenter={onRecordCenter}
                                            registerScrollFn={registerScrollFns?.pladias}
                                            onRecordUpdated={onRecordUpdated}
                                        />
                                        {records.pladias.length === 0 && (
                                            <p className="text-muted small">{t('atlas.mapDetail.noRecords')}</p>
                                        )}
                                    </>
                                ) : (
                                    <ExternalRecordsTable
                                        key={`${source.id}-table-${currentSquareCode}`}
                                        records={records[source.id]}
                                        highlightedRecordId={highlightedRecordId}
                                        onRecordHover={onRecordHover}
                                        registerScrollFn={registerScrollFns?.[source.id]}
                                    />
                                )}
                            </Tab>
                        ))}
                    </Tabs>
                </div>
            )}
        </div>
    );
}

export default InfoPanel;

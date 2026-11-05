import {Accordion, Button} from 'react-bootstrap';
import {useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getTaxonMapStatistics} from '@/services/taxonApi';
import {getTaxonMapSettings} from '@/services/atlasApi';
import {notifyApiError} from '@/stores/notificationStore';
import RichTextMessage from '@/components/RichTextMessage';
import {useTaxonUpdates} from '@/hooks/useTaxonUpdates';
import {useTranslation} from 'react-i18next';

interface InfoPanelProps {
    taxonName?: string;
    taxonId?: number;
}

interface SectionProps {
    eventKey: string;
    title: string;
    children: React.ReactNode;
}

function InfoSection({eventKey, title, children}: SectionProps) {
    return (
        <Accordion.Item eventKey={eventKey}>
            <Accordion.Header>{title}</Accordion.Header>
            <Accordion.Body>
                {children}
            </Accordion.Body>
        </Accordion.Item>
    );
}

const MAP_TYPES = [
    {id: 1, key: 'atlas.mapMain.infoPanel.mapTypes.basic'},
    {id: 2, key: 'atlas.mapMain.infoPanel.mapTypes.extinctVsRecent'},
    {id: 3, key: 'atlas.mapMain.infoPanel.mapTypes.nativeVsNonNative'},
    {id: 4, key: 'atlas.mapMain.infoPanel.mapTypes.herbariumVsNonHerbarium'},
] as const;

// Revision status IDs, must match app/models/RevisionStatus.java
const REVISION_STATUS_MAP_SUBMITTED = 3;
const REVISION_STATUS_REVIEW = 4;
const REVISION_STATUS_COMPLETING = 5;
const REVISION_STATUS_CLOSED = 6;

export function InfoPanel({taxonName, taxonId}: InfoPanelProps) {
    const {t} = useTranslation();

    // statistiky taxonu – jen pro zobrazení (bez cache, sekce J)
    const statisticsQuery = useQuery({
        queryKey: ['taxonMapStatistics', taxonId],
        queryFn: () => getTaxonMapStatistics(taxonId!),
        enabled: taxonId !== undefined,
    });
    const statistics = statisticsQuery.data ?? null;

    // nastavení mapy taxonu – inicializuje editovatelná pole panelu
    const settingsQuery = useQuery({
        queryKey: ['taxonMapSettings', taxonId],
        queryFn: () => getTaxonMapSettings(taxonId!),
        enabled: taxonId !== undefined,
    });

    // editovatelná pole (form state) naplněná z načteného nastavení; mutace
    // (useTaxonUpdates) zůstávají imperativní a timestamp si drží lokálně.
    // Render-phase update guarded by comparison (React docs: adjusting state
    // when a prop changes) – kopie do formulářového stavu bez efektu.
    const [currentUserIsRevisor, setCurrentUserIsRevisor] = useState<boolean>(false);
    const [revisorsComment, setRevisorsComment] = useState<string>('');
    const [revisorsPrintMapComment, setRevisorsPrintMapComment] = useState<string>('');
    const [mapType, setMapType] = useState<number>(1);
    const [lastEditTimestamp, setLastEditTimestamp] = useState<number>(0);
    const [isMapped, setIsMapped] = useState<boolean>(false);
    const [revisionStatusId, setRevisionStatusId] = useState<number>(0);
    const [revisionUpdating, setRevisionUpdating] = useState<boolean>(false);

    const {
        updateRevisorsComment,
        updateRevisorsPrintMapComment,
        updateMapType,
        updateRevisionStatusForTaxon
    } = useTaxonUpdates();

    // Načtené nastavení inicializuje editovatelná pole panelu (kopie do
    // form state – mutation jinde nechává uživatelské úpravy nedotčené).
    const [prevSettings, setPrevSettings] = useState(settingsQuery.data);
    if (settingsQuery.data !== prevSettings) {
        setPrevSettings(settingsQuery.data);
        const data = settingsQuery.data;
        if (data) {
            setCurrentUserIsRevisor(data.currentUserIsRevisor ?? false);
            setRevisorsComment(data.revisorsComment ?? '');
            setRevisorsPrintMapComment(data.revisorsPrintComment ?? '');
            setMapType(data.mapType ?? 1);
            setLastEditTimestamp(data.lastEditTimestamp);
            setIsMapped(data.isMapped);
            setRevisionStatusId(data.revisionStatusId);
        }
    }

    // chyby: statistiky se zobrazí inline, nastavení notifikací (jako dřív)
    const loading = statisticsQuery.isPending || settingsQuery.isPending;
    const error = statisticsQuery.error ? t('atlas.mapMain.infoPanel.loadingStatistics') : null;

    useEffect(() => {
        if (settingsQuery.error) {
            notifyApiError(settingsQuery.error, t('atlas.mapMain.infoPanel.loadError'));
        }
    }, [settingsQuery.error, t]);

    const handleRevisorsCommentChange = async (value: string) => {
        setRevisorsComment(value);
        if (taxonId && lastEditTimestamp) {
            try {
                const newTimestamp = await updateRevisorsComment(taxonId, value, lastEditTimestamp);
                setLastEditTimestamp(newTimestamp);
            } catch (err) {
                notifyApiError(err, t('atlas.mapMain.infoPanel.saveError'));
            }
        }
    };

    const handleRevisorsPrintMapCommentChange = async (value: string) => {
        setRevisorsPrintMapComment(value);
        if (taxonId && lastEditTimestamp) {
            try {
                const newTimestamp = await updateRevisorsPrintMapComment(taxonId, value, lastEditTimestamp);
                setLastEditTimestamp(newTimestamp);
            } catch (err) {
                notifyApiError(err, t('atlas.mapMain.infoPanel.saveError'));
            }
        }
    };

    const handleMapTypeChange = async (newMapType: number) => {
        setMapType(newMapType);
        if (taxonId && lastEditTimestamp) {
            try {
                const newTimestamp = await updateMapType(taxonId, newMapType, lastEditTimestamp);
                setLastEditTimestamp(newTimestamp);
            } catch (err) {
                notifyApiError(err, t('atlas.mapMain.infoPanel.saveError'));
            }
        }
    };

    const handleRevisionStatusChange = async (newStatus: number) => {
        if (!taxonId || !lastEditTimestamp) {
            return;
        }
        setRevisionUpdating(true);
        try {
            const newTimestamp = await updateRevisionStatusForTaxon(taxonId, newStatus, lastEditTimestamp);
            setLastEditTimestamp(newTimestamp);
            setRevisionStatusId(newStatus);
        } catch (err) {
            notifyApiError(err, t('atlas.mapMain.infoPanel.saveError'));
        } finally {
            setRevisionUpdating(false);
        }
    };

    return (
        <div className="d-flex flex-column h-100 overflow-hidden">
            <div className="flex-shrink-0 mb-3">
                {taxonName && (
                    <h4>
                        {/* ID taxonu jako hover title jména (dříve viditelný text). */}
                        <RichTextMessage html={taxonName}
                                         title={taxonId != null ? `ID: ${taxonId}` : undefined}/>
                    </h4>
                )}

            </div>
            <div className="flex-grow-1 overflow-auto">
                <Accordion defaultActiveKey="0" alwaysOpen>
                    <InfoSection eventKey="0" title={t('atlas.mapMain.infoPanel.recordCounts')}>
                        {loading && <p className="text-muted">{t('atlas.mapMain.infoPanel.loadingStatistics')}</p>}
                        {error && <p className="text-danger">{error}</p>}
                        {!loading && !error && statistics && (
                            <>
                                <p><b>{t('atlas.mapMain.infoPanel.records')}</b>
                                    <br/>
                                    (OK/inMap/declined/uncertain/not set/SUM)
                                    <br/>
                                    <span className="text-accepted">{statistics.recordsAccepted}</span> /
                                    <span className="text-accepted">{statistics.recordsIncludedInMap}</span> /
                                    <span className="text-declined">{statistics.recordsDeclined}</span> /
                                    <span className="text-uncertain">{statistics.recordsUncertain}</span> /
                                    <span className="text-unprocessed">{statistics.recordsUnprocessed}</span> /
                                    <span>{statistics.recordsTotal}</span>
                                </p>
                                {/*TODO deprecated*/}
                                {/*<p><b>{t("atlas.mapMain.infoPanel.quadrantStatus")}</b><br/>(OK/declined/uncertain/not set/SUM)</p>*/}
                                {/*<p>*/}
                                {/*    <span className="text-accepted">{statistics.quadrantsValidated}</span> /*/}
                                {/*    <span className="text-declined">{statistics.quadrantsDeclined}</span> /*/}
                                {/*    <span className="text-uncertain">{statistics.quadrantsUncertain}</span> /*/}
                                {/*    <span className="text-unprocessed">{statistics.quadrantsUnprocessed}</span> /*/}
                                {/*    <span>{statistics.quadrantsValidated + statistics.quadrantsDeclined + statistics.quadrantsUncertain + statistics.quadrantsUnprocessed}</span>*/}
                                {/*</p>*/}
                                <p><b>{t('atlas.mapMain.infoPanel.ofWhich')}</b></p>
                                <p>
                                    {/*TODO deprecated*/}
                                    {/*{statistics.recordsBoundToQuadrants} {t("atlas.mapMain.infoPanel.boundToQuadrant")}<br/>*/}
                                    {/*{statistics.recordsBoundToSquares} {t("atlas.mapMain.infoPanel.boundToSquare")}<br/>*/}
                                    {statistics.recordsBoundToCoords} {t('atlas.mapMain.infoPanel.hasCoordinates')}<br/>
                                    {statistics.recordsNotBoundToCoords} {t('atlas.mapMain.infoPanel.noLocation')}<br/>
                                    {statistics.recordsCommented} {t('atlas.mapMain.infoPanel.hasComment')}
                                </p>
                            </>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="1" title={t('atlas.mapMain.infoPanel.mapAuthors')}>
                        {!loading && !error && statistics?.supervisors && statistics.supervisors.length > 0 ? (
                            <p className="mb-0 fst-italic">
                                {statistics.supervisors.map((supervisor, index) => (
                                    <span key={index}>
                                        {supervisor.name}{index < statistics.supervisors.length - 1 ? ', ' : ''}
                                    </span>
                                ))}
                            </p>
                        ) : (
                            <p>{t('atlas.mapMain.infoPanel.noSupervisors')}</p>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="2" title={t('atlas.mapMain.infoPanel.mapAuthorsNote')}>
                        {currentUserIsRevisor ? (
                            <textarea
                                className="form-control"
                                rows={10}
                                value={revisorsComment}
                                onChange={(e) => handleRevisorsCommentChange(e.target.value)}
                            />
                        ) : (
                            <p className="mb-0">{revisorsComment || t('atlas.mapMain.infoPanel.noComment')}</p>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="3" title={t('atlas.mapMain.infoPanel.printMapNote')}>
                        {currentUserIsRevisor ? (
                            <textarea
                                className="form-control"
                                rows={10}
                                value={revisorsPrintMapComment}
                                onChange={(e) => handleRevisorsPrintMapCommentChange(e.target.value)}
                            />
                        ) : (
                            <p className="mb-0">{revisorsPrintMapComment || t('atlas.mapMain.infoPanel.noComment')}</p>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="4" title={t('atlas.mapMain.infoPanel.mapTypeSelection')}>
                        <p id="revision-status" className="mb-3">
                            {currentUserIsRevisor && isMapped && revisionStatusId < REVISION_STATUS_MAP_SUBMITTED && (
                                <>
                                    {t('atlas.mapMain.infoPanel.revisionStatus.submit')}
                                    {' '}
                                    <Button
                                        variant="warning"
                                        size="sm"
                                        id="submit-revision"
                                        disabled={revisionUpdating}
                                        onClick={() => handleRevisionStatusChange(REVISION_STATUS_MAP_SUBMITTED)}
                                    >
                                        {t('atlas.mapMain.infoPanel.revisionStatus.submitButton')}
                                    </Button>
                                </>
                            )}
                            {currentUserIsRevisor && revisionStatusId === REVISION_STATUS_MAP_SUBMITTED && (
                                <>{t('atlas.mapMain.infoPanel.revisionStatus.submited')}</>
                            )}
                            {currentUserIsRevisor && revisionStatusId === REVISION_STATUS_REVIEW && (
                                <>{t('atlas.mapMain.infoPanel.revisionStatus.supervised')}</>
                            )}
                            {currentUserIsRevisor && revisionStatusId === REVISION_STATUS_COMPLETING && (
                                <>
                                    {t('atlas.mapMain.infoPanel.revisionStatus.finishing')}
                                    {' '}
                                    <Button
                                        variant="warning"
                                        size="sm"
                                        id="lock-revision"
                                        disabled={revisionUpdating}
                                        onClick={() => handleRevisionStatusChange(REVISION_STATUS_CLOSED)}
                                    >
                                        {t('atlas.mapMain.infoPanel.revisionStatus.feedbackProceeded')}
                                    </Button>
                                </>
                            )}
                        </p>
                        <p>{t('atlas.mapMain.infoPanel.mapTypeDescription')}</p>
                        {taxonId && (
                            <div className="d-flex flex-column gap-2">
                                {MAP_TYPES.map((mapTypeOption) => (
                                    <div key={mapTypeOption.id} className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="mapType"
                                            id={`mapType-${mapTypeOption.id}`}
                                            value={mapTypeOption.id}
                                            checked={mapType === mapTypeOption.id}
                                            onChange={() => handleMapTypeChange(mapTypeOption.id)}
                                            disabled={!currentUserIsRevisor}
                                        />
                                        <label className="form-check-label" htmlFor={`mapType-${mapTypeOption.id}`}>
                                            {t(mapTypeOption.key)}
                                        </label>
                                        <a href={`/atlas/mapPreview/${taxonId}/${mapTypeOption.id}`}
                                           className="ms-2 small">
                                            {t('atlas.mapMain.infoPanel.preview')}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="5" title={t('atlas.mapMain.infoPanel.sourceProjects')}>
                        {loading && <p className="text-muted">{t('atlas.mapMain.infoPanel.loadingStatistics')}</p>}
                        {error && <p className="text-danger">{error}</p>}
                        {!loading && !error && statistics?.recordsByProject && statistics.recordsByProject.length > 0 ? (
                            <ul className="mb-0">
                                {statistics.recordsByProject.map((item, index) => (
                                    <li key={index}>
                                        {item.project.name || item.project.abbrev} = {item.recordCount}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>{t('atlas.mapMain.infoPanel.projectsLoading')}</p>
                        )}
                    </InfoSection>
                </Accordion>
            </div>
        </div>
    );
}

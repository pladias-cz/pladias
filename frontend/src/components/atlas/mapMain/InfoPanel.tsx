import {Accordion} from 'react-bootstrap';
import {useEffect, useState} from 'react';
import axios from 'axios';
import {useTaxonUpdates} from '../../atlasAdmin/taxaList/hooks';
import {useTranslation} from 'react-i18next';

interface InfoPanelProps {
    taxonName?: string;
    taxonId?: number;
}

interface ProjectDto {
    id: number;
    name: string;
    abbrev: string;
}

interface ProjectRecordCountDto {
    project: ProjectDto;
    recordCount: number;
}

interface UserMinimalDto {
    id: number;
    name: string;
}

interface TaxonStatisticsResponse {
    data: TaxonStatisticsDto;
}

interface TaxonStatisticsDto {
    recordsTotal: number;
    recordsAccepted: number;
    recordsDeclined: number;
    recordsUncertain: number;
    recordsUnprocessed: number;
    recordsIncludedInMap: number;
    recordsCommented: number;
    recordsUncommented: number;
    recordsBoundToQuadrants: number;
    recordsBoundToSquares: number;
    recordsBoundToCoords: number;
    recordsNotBoundToCoords: number;
    quadrantsValidated: number;
    quadrantsUncertain: number;
    quadrantsDeclined: number;
    quadrantsUnprocessed: number;
    recordsByProject: ProjectRecordCountDto[];
    supervisors: UserMinimalDto[];
}

interface TaxonMapSettingsData {
    taxonId: number;
    taxonNameLat: string;
    taxonRankCz: string;
    isMapped: boolean;
    commonThreshold: any;
    isProtected: boolean;
    preslia: string;
    revisors: string;
    revisorsComment: string | null;
    revisorsPrintComment: string | null;
    revisionStatusId: number;
    revisionStatusDescription: string;
    publicationStatusId: number;
    publicationStatusDescription: string;
    lastEditTimestamp: number;
    parentTaxonId: any;
    parentTaxonNameLat: string;
    csvMapDetailId: any;
    csvMapDetailTimestamp: any;
    hasPng: boolean;
    currentUserIsRevisor: boolean;
    mapType: number;
}

interface TaxonMapSettingsResponse {
    data: TaxonMapSettingsData;
    success: boolean;
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
    {id: 1, key: 'components.atlas.mapMain.infoPanel.mapTypes.basic'},
    {id: 2, key: 'components.atlas.mapMain.infoPanel.mapTypes.extinctVsRecent'},
    {id: 3, key: 'components.atlas.mapMain.infoPanel.mapTypes.nativeVsNonNative'},
    {id: 4, key: 'components.atlas.mapMain.infoPanel.mapTypes.herbariumVsNonHerbarium'},
];

export function InfoPanel({taxonName, taxonId}: InfoPanelProps) {
    const { t } = useTranslation();
    const [statistics, setStatistics] = useState<TaxonStatisticsDto | null>(null);
    const [currentUserIsRevisor, setCurrentUserIsRevisor] = useState<boolean>(false);
    const [revisorsComment, setRevisorsComment] = useState<string>('');
    const [revisorsPrintMapComment, setRevisorsPrintMapComment] = useState<string>('');
    const [mapType, setMapType] = useState<number>(1);
    const [lastEditTimestamp, setLastEditTimestamp] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const {updateRevisorsComment, updateRevisorsPrintMapComment, updateMapType} = useTaxonUpdates();

    useEffect(() => {
        if (!taxonId) {
            return;
        }

        setLoading(true);
        setError(null);

        // Fetch taxon statistics
        axios.get<TaxonStatisticsResponse>(`/api/react/taxonStatistics/${taxonId}`)
            .then(response => {
                if (response.data && response.data.data) {
                    setStatistics(response.data.data);
                }
            })
            .catch(err => {
                console.error('Failed to load taxon statistics:', err);
                setError(t("atlas.mapMain.component.infoPanel.loadingStatistics"));
            });

        // Fetch taxon map settings to get currentUserIsRevisor and comments
        axios.get<TaxonMapSettingsResponse>(`/api/react/atlas/taxonMapSettings/${taxonId}`)
            .then(response => {
                if (response.data && response.data.data) {
                    setCurrentUserIsRevisor(response.data.data.currentUserIsRevisor);
                    setRevisorsComment(response.data.data.revisorsComment ?? '');
                    setRevisorsPrintMapComment(response.data.data.revisorsPrintComment ?? '');
                    setMapType(response.data.data.mapType ?? 1);
                    setLastEditTimestamp(response.data.data.lastEditTimestamp);
                }
            })
            .catch(err => {
                console.error('Failed to load taxon map settings:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [taxonId]);

    const handleRevisorsCommentChange = async (value: string) => {
        setRevisorsComment(value);
        if (taxonId && lastEditTimestamp) {
            try {
                const newTimestamp = await updateRevisorsComment(taxonId, value, lastEditTimestamp);
                setLastEditTimestamp(newTimestamp);
            } catch (err) {
                console.error('Failed to save REVISORSCOMMENT:', err);
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
                console.error('Failed to save REVISORSPRINTMAPCOMMENT:', err);
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
                console.error('Failed to save MAPTYPE:', err);
            }
        }
    };

    return (
        <div className="d-flex flex-column h-100 overflow-hidden">
            <div className="flex-shrink-0 mb-3">
                {taxonName && (
                    <h4>
                        <span dangerouslySetInnerHTML={{__html: taxonName}}/>
                        <span className="text-muted small"> ID: {taxonId}</span>
                    </h4>
                )}

            </div>
            <div className="flex-grow-1 overflow-auto">
                <Accordion defaultActiveKey="0" alwaysOpen>
                    <InfoSection eventKey="0" title={t("atlas.mapMain.component.infoPanel.recordCounts")}>
                        {loading && <p className="text-muted">{t("atlas.mapMain.component.infoPanel.loadingStatistics")}</p>}
                        {error && <p className="text-danger">{error}</p>}
                        {!loading && !error && statistics && (
                            <>
                                <p><b>{t("atlas.mapMain.component.infoPanel.records")}</b>
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
                                <p><b>{t("atlas.mapMain.component.infoPanel.quadrantStatus")}</b><br/>(OK/declined/uncertain/not set/SUM)</p>
                                <p>
                                    <span className="text-accepted">{statistics.quadrantsValidated}</span> /
                                    <span className="text-declined">{statistics.quadrantsDeclined}</span> /
                                    <span className="text-uncertain">{statistics.quadrantsUncertain}</span> /
                                    <span className="text-unprocessed">{statistics.quadrantsUnprocessed}</span> /
                                    <span>{statistics.quadrantsValidated + statistics.quadrantsDeclined + statistics.quadrantsUncertain + statistics.quadrantsUnprocessed}</span>
                                </p>
                                <p><b>{t("atlas.mapMain.component.infoPanel.ofWhich")}</b></p>
                                <p>
                                    {statistics.recordsBoundToQuadrants} {t("atlas.mapMain.component.infoPanel.boundToQuadrant")}<br/>
                                    {statistics.recordsBoundToSquares} {t("atlas.mapMain.component.infoPanel.boundToSquare")}<br/>
                                    {statistics.recordsBoundToCoords} {t("atlas.mapMain.component.infoPanel.hasCoordinates")}<br/>
                                    {statistics.recordsNotBoundToCoords} {t("atlas.mapMain.component.infoPanel.noLocation")}<br/>
                                    {statistics.recordsCommented} {t("atlas.mapMain.component.infoPanel.hasComment")}
                                </p>
                            </>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="1" title={t("atlas.mapMain.component.infoPanel.mapAuthors")}>
                        {!loading && !error && statistics?.supervisors && statistics.supervisors.length > 0 ? (
                            <p className="mb-0 fst-italic">
                                {statistics.supervisors.map((supervisor, index) => (
                                    <span key={index}>
                                        {supervisor.name}{index < statistics.supervisors.length - 1 ? ', ' : ''}
                                    </span>
                                ))}
                            </p>
                        ) : (
                            <p>{t("atlas.mapMain.component.infoPanel.noSupervisors")}</p>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="2" title={t("atlas.mapMain.component.infoPanel.mapAuthorsNote")}>
                        {currentUserIsRevisor ? (
                            <textarea
                                className="form-control"
                                rows={10}
                                value={revisorsComment}
                                onChange={(e) => handleRevisorsCommentChange(e.target.value)}
                            />
                        ) : (
                            <p className="mb-0">{revisorsComment || t('components.atlas.mapMain.infoPanel.noComment')}</p>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="3" title={t("atlas.mapMain.component.infoPanel.printMapNote")}>
                        {currentUserIsRevisor ? (
                            <textarea
                                className="form-control"
                                rows={10}
                                value={revisorsPrintMapComment}
                                onChange={(e) => handleRevisorsPrintMapCommentChange(e.target.value)}
                            />
                        ) : (
                            <p className="mb-0">{revisorsPrintMapComment || t('components.atlas.mapMain.infoPanel.noComment')}</p>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="4" title={t("atlas.mapMain.component.infoPanel.mapTypeSelection")}>
                        <p>{t("atlas.mapMain.component.infoPanel.mapTypeDescription")}</p>
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
                                        />
                                        <label className="form-check-label" htmlFor={`mapType-${mapTypeOption.id}`}>
                                            {t(mapTypeOption.key)}
                                        </label>
                                        <a href={`/react/atlas/mapPreview/${taxonId}/${mapTypeOption.id}`} className="ms-2 small">
                                            {t("atlas.mapMain.component.infoPanel.preview")}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </InfoSection>
                    <InfoSection eventKey="5" title={t("atlas.mapMain.component.infoPanel.sourceProjects")}>
                        {loading && <p className="text-muted">{t("atlas.mapMain.component.infoPanel.loadingStatistics")}</p>}
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
                            <p>{t("atlas.mapMain.component.infoPanel.projectsLoading")}</p>
                        )}
                    </InfoSection>
                </Accordion>
            </div>
        </div>
    );
}

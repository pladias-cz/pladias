import type {MapPreviewType} from '@/pages/atlas/MapPreview';
import {useEffect, useState} from 'react';
import axios from 'axios';
import type {TaxonMapSettings} from '@/components/atlas/taxaList/types';
import {useTranslation} from 'react-i18next';

interface InfoPanelProps {
    type?: MapPreviewType;
    taxonId?: number;
    taxonName?: string;
}

interface TaxonMapSettingsResponse {
    data: TaxonMapSettings;
}

export function InfoPanel({type = 1, taxonId, taxonName}: InfoPanelProps) {
    const { t } = useTranslation();
    const [mapSettings, setMapSettings] = useState<TaxonMapSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get translated map type content
    const translatedContent = {
        title: t(`pages.atlas.mapPreview.typeContent.${type}.title`),
        description: t(`pages.atlas.mapPreview.typeContent.${type}.description`),
        legend: {
            certainQuadrant: t("atlas.mapPreview.typeContent.1.legend.certainQuadrant"),
            uncertainQuadrant: t("atlas.mapPreview.typeContent.1.legend.uncertainQuadrant"),
            quadrantByThreshold: t("atlas.mapPreview.typeContent.1.legend.quadrantByThreshold"),
            recentFindings: t("atlas.mapPreview.typeContent.2.legend.recentFindings"),
            extinctFindings: t("atlas.mapPreview.typeContent.2.legend.extinctFindings"),
            native: t("atlas.mapPreview.typeContent.3.legend.native"),
            nonNative: t("atlas.mapPreview.typeContent.3.legend.nonNative"),
            cultivated: t("atlas.mapPreview.typeContent.3.legend.cultivated"),
            notSpecified: t("atlas.mapPreview.typeContent.3.legend.notSpecified"),
            herbariumSupported: t("atlas.mapPreview.typeContent.4.legend.herbariumSupported"),
            nonHerbariumEvidence: t("atlas.mapPreview.typeContent.4.legend.nonHerbariumEvidence"),
        }
    };

    // Define legend colors by type (only color info needed, labels come from translations)
    const getLegendColors = () => {
        switch (type) {
            case 1: return ['black', 'orange', 'blue'];
            case 2: return ['black', 'gray', 'orange'];
            case 3: return ['black', 'gray', 'yellow', 'orange'];
            case 4: return ['black', 'khaki', 'orange'];
            default: return [];
        }
    };

    useEffect(() => {
        if (!taxonId) {
            return;
        }

        setLoading(true);
        setError(null);

        axios.get<TaxonMapSettingsResponse>(`/api/react/atlas/taxonMapSettings/${taxonId}`)
            .then(response => {
                if (response.data && response.data.data) {
                    setMapSettings(response.data.data);
                }
            })
            .catch(err => {
                console.error('Failed to load taxon map settings:', err);
                setError(t('components.atlas.mapPreview.loading'));
            })
            .finally(() => {
                setLoading(false);
            });
    }, [taxonId]);

    return (
        <div className="d-flex flex-column h-100 overflow-hidden">
            <div className={`p-3 bg-warning flex-shrink-0`}>
                <h2>{t("atlas.mapPreview.preview")} <span className={`small`}> <a href={`/atlas/mapMain/${taxonId}`}>{t("atlas.mapPreview.backToMainMap")}</a></span> </h2>
                {taxonName && (
                    <h4>
                        <span dangerouslySetInnerHTML={{__html: taxonName}}/>
                        <span className="text-muted small"> ID: {taxonId}</span>
                    </h4>
                )}
                <hr />
                <h5 className="mt-3 mb-4">{t("atlas.mapPreview.mapType")} {translatedContent.title}</h5>
                <p className="fst-italic">{translatedContent.description}</p>
            </div>
            <div className="flex-grow-1 overflow-auto p-3">
                <h5>{t("atlas.mapPreview.mapAuthorsNote")}</h5>
                {loading && <p className="text-muted">{t("atlas.mapPreview.loading")}</p>}
                {error && <p className="text-danger">{error}</p>}
                {!loading && !error && mapSettings && (
                    <>
                        <p className={`bg-info bg-opacity-10 p-2`}>{mapSettings.revisorsComment || t("atlas.mapPreview.noComment")}</p>
                        {mapSettings.revisorsPrintComment && (
                            <>
                                <h6 className="mt-3">{t("atlas.mapPreview.printMapNote")}</h6>
                                <p className={`bg-info bg-opacity-10 p-2`}>{mapSettings.revisorsPrintComment}</p>
                            </>
                        )}
                        <p><b>{t("atlas.mapPreview.revisionStatus")} </b>{mapSettings.revisionStatusDescription}<br/>
                            <b>{t("atlas.mapPreview.publicationStatus")} </b>{mapSettings.publicationStatusDescription}</p>
                        {mapSettings.commonThreshold !== null && (
                            <p><b>
                                {t("atlas.mapPreview.commonThreshold")} {mapSettings.commonThreshold}</b></p>
                        )}
                    </>
                )}
                <hr/>
                <div className="mt-2">
                    <p><strong>{t("atlas.mapPreview.legend")}</strong></p>
                    {type === 1 && getLegendColors().map((color, index) => {
                        const legendKeys = !mapSettings?.commonThreshold
                            ? ['certainQuadrant', 'uncertainQuadrant']
                            : ['certainQuadrant', 'uncertainQuadrant', 'quadrantByThreshold'];
                        if (!legendKeys[index]) return null;
                        return (
                            <p key={index}>
                                <span className={`circle ${color}`}></span>{translatedContent.legend[legendKeys[index] as keyof typeof translatedContent.legend]}
                            </p>
                        );
                    })}
                    {type === 2 && getLegendColors().map((color, index) => {
                        const legendKeys = ['recentFindings', 'extinctFindings', 'uncertainQuadrant'];
                        return (
                            <p key={index}>
                                <span className={`circle ${color}`}></span>{translatedContent.legend[legendKeys[index] as keyof typeof translatedContent.legend]}
                            </p>
                        );
                    })}
                    {type === 3 && getLegendColors().map((color, index) => {
                        const legendKeys = ['native', 'nonNative', 'cultivated', 'notSpecified'];
                        return (
                            <p key={index}>
                                <span className={`circle ${color}`}></span>{translatedContent.legend[legendKeys[index] as keyof typeof translatedContent.legend]}
                            </p>
                        );
                    })}
                    {type === 4 && getLegendColors().map((color, index) => {
                        const legendKeys = ['herbariumSupported', 'nonHerbariumEvidence', 'uncertainQuadrant'];
                        return (
                            <p key={index}>
                                <span className={`circle ${color}`}></span>{translatedContent.legend[legendKeys[index] as keyof typeof translatedContent.legend]}
                            </p>
                        );
                    })}
                </div>
            </div>
            <style>{`
                .circle {
                    border-radius: 50%;
                    display: inline-block;
                    margin-right: 10px;
                    width: 15px;
                    height: 15px;
                    border: 2px solid #fff;
                }
                .circle.orange {
                    background: rgba(255, 60, 0, 1);
                }
                .circle.yellow {
                    background: rgba(255, 255, 0, 1);
                }
                .circle.black {
                    background: rgba(0, 0, 0, 1);
                }
                .circle.gray {
                    background: rgba(128, 128, 128, 1);
                }
                 .gray {
                    background: rgba(160, 160, 160, 1);
                }

                .blue {
                    background: rgba(0, 0, 200, 0.8);
                }

                .khaki {
                    background: rgb(240, 230, 140);
                }
            `}</style>
        </div>
    );
}

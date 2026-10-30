import {useTranslation} from 'react-i18next';
import type {ProjectType} from '@/models/AtlasRecords';
import {EXTERNAL_MARKER_FILL_COLOR, type RecordSourceConfig} from './recordSources';

interface RecordSourceTabTitleProps {
    /** Konfigurace zdroje (label, barva okraje markerů). */
    source: RecordSourceConfig;
    /** Počet záznamů zdroje – ukazatel v hlavičce. */
    count: number;
    /** Je skupina zdroje viditelná na mapě? */
    visible: boolean;
    /** Přepnutí viditelnosti na mapě (checkbox v hlavičce). */
    onToggleVisibility: (project: ProjectType) => void;
}

/**
 * Hlavička tabu jednoho zdroje záznamů – obsah `title` prop react-bootstrap
 * Tabu. Nese checkbox „zobrazit na mapě", tečku (miniaturu markerů daného
 * zdroje na mapě – šedá výplň, okraj v barvě okraje markerů zdroje) a počet
 * záznamů. Klik na checkbox nesmí
 * přepnout aktivní tab – react-bootstrap Tabs poslouchá klik na celé hlavičce
 * (nav-link), proto obal checkboxu zastavuje propagaci (stopPropagation).
 */
export function RecordSourceTabTitle({source, count, visible, onToggleVisibility}: RecordSourceTabTitleProps) {
    const {t} = useTranslation();
    const showOnMapLabel = t('atlas.mapDetail.showOnMap', {source: source.label});

    return (
        <span className="record-source-tab-title">
            <span className="record-source-tab-title__check" onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    className="form-check-input"
                    checked={visible}
                    onChange={() => onToggleVisibility(source.id)}
                    aria-label={showOnMapLabel}
                    title={showOnMapLabel}
                />
            </span>
            <span
                className="record-source-tab-title__dot"
                style={{
                    backgroundColor: EXTERNAL_MARKER_FILL_COLOR,
                    borderColor: source.strokeColor,
                }}
                aria-hidden="true"
            />
            {source.label}
            <span className="text-muted small">({count})</span>
        </span>
    );
}

export default RecordSourceTabTitle;

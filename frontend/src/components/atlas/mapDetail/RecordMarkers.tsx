import {Circle, CircleMarker, Popup, Tooltip} from 'react-leaflet';
import type {RecordGbifMinimal, ProjectType} from '@/models/AtlasRecords';
import {EXTERNAL_MARKER_FILL_COLOR} from './recordSources';
import './RecordMarkers.scss';

interface RecordMarkersProps {
    records: RecordGbifMinimal[];
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
    /** Kód aktuálního kvadrantu – jen jeho záznamy mají popup a interakce, okolní se jen vykreslují. */
    currentSquareCode: string;
}

/**
 * Okraj markeru odlišuje zdroj záznamu (černá/červená/oranžová – zrcadlí
 * RECORD_SOURCES v recordSources.ts), výplň je pro všechny externí zdroje
 * pevně šedá (EXTERNAL_MARKER_FILL_COLOR). Markery všech zdrojů mají
 * stejnou velikost.
 */
const MARKER_CONFIG: Record<ProjectType, { shape: 'circle', baseRadius: number, strokeColor: string }> = {
    pladias: {shape: 'circle', baseRadius: 8, strokeColor: '#000000'},
    gbif: {shape: 'circle', baseRadius: 8, strokeColor: '#CC0000'},
    inaturalist: {shape: 'circle', baseRadius: 8, strokeColor: '#EF7C09'},
};

function RecordMarkers({records, highlightedRecordId, onRecordHover, currentSquareCode}: RecordMarkersProps) {
    const formatRecordLabel = (record: RecordGbifMinimal): string => {
        const parts: string[] = [];
        if (record.year) {
            parts.push(`${record.year}`);
        }
        if (record.recordedBy) {
            parts.push(record.recordedBy);
        }
        return parts.join(' - ') || '';
    };

    return (
        <>
            {records.map((record) => {
                const isHighlighted = highlightedRecordId === record.id;
                const label = formatRecordLabel(record);
                // záznamy mimo aktuální kvadrant se na mapě jen vykreslují – bez popupu a interakcí
                const isCurrentSquare = record.computedSquareCode === currentSquareCode;
                const config = MARKER_CONFIG[record.project] || MARKER_CONFIG.gbif;
                const baseRadius = config.baseRadius;
                const radius = isHighlighted ? baseRadius + 4 : baseRadius;

                const commonEventHandlers = {
                    mouseover: () => onRecordHover?.(record.id),
                    mouseout: () => onRecordHover?.(null),
                    click: () => onRecordHover?.(record.id),
                };

                const commonPopup = (
                    <Popup>
                        <div>
                            <strong>ID: {record.id}</strong><br/>
                            <span className="text-muted">{record.project.toUpperCase()}</span><br/>
                            {record.year && <span>Rok: {record.year}<br/></span>}
                            {record.recordedBy && <span>Sběratel: {record.recordedBy}<br/></span>}
                            <a href={`https://www.gbif.org/occurrence/${record.id}`} target="_blank"
                               rel="noopener noreferrer">
                                Zobrazit na GBIF
                            </a>
                        </div>
                    </Popup>
                );

                return (
                    <>
                        {(record.gpsPrecision ?? 0) > 0 && (
                            <Circle
                                key={`precision-${record.id}`}
                                center={[record.latitude, record.longitude]}
                                radius={record.gpsPrecision! / 2}
                                pathOptions={{
                                    color: config.strokeColor,
                                    fillColor: EXTERNAL_MARKER_FILL_COLOR,
                                    fillOpacity: 0.25,
                                    weight: 1,
                                    dashArray: '4, 4'
                                }}
                                eventHandlers={{}}
                                interactive={false}
                            />
                        )}
                        <CircleMarker
                            key={record.id}
                            center={[record.latitude, record.longitude]}
                            radius={radius}
                            pathOptions={{
                                color: config.strokeColor,
                                fillColor: EXTERNAL_MARKER_FILL_COLOR,
                                fillOpacity: isHighlighted ? 0.9 : 0.6,
                                weight: 2
                            }}
                            eventHandlers={isCurrentSquare ? commonEventHandlers : undefined}
                        >
                            {label && (
                                <Tooltip permanent direction="top" offset={[0, -16]}
                                         className="record-label-transparent">
                                    <span style={{
                                        fontSize: '13px',
                                        whiteSpace: 'nowrap',
                                        color: '#000',
                                        fontWeight: 700,
                                        textShadow: '0 0 2px #fff, 0 0 2px #fff'
                                    }}>
                                        {label}
                                    </span>
                                </Tooltip>
                            )}
                            {isCurrentSquare && commonPopup}
                        </CircleMarker>
                    </>
                );
            })}
        </>
    );
}

export default RecordMarkers;

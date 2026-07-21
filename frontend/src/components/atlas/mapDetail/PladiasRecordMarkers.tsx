import { Circle, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import type { RecordPladias } from '@/models';
import './RecordMarkers.scss';

interface PladiasRecordMarkersProps {
    records: RecordPladias[];
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
}

const MARKER_CONFIG = {
    shape: 'circle' as const,
    baseRadius: 8,
    strokeColor: '#000000',
};

function PladiasRecordMarkers({ records, highlightedRecordId, onRecordHover }: PladiasRecordMarkersProps) {
    const getValidationColor = (record: RecordPladias): string => {
        return record.validationStatusColor || '#808080';
    };

    const formatRecordLabel = (record: RecordPladias): string => {
        const parts: string[] = [];
        if (record.year) {
            parts.push(`${record.year}`);
        }

        parts.push(record.recordAuthorsNames ?? '');

        return parts.join(' - ') || '';
    };

    return (
        <>
            {records.map((record) => {
                // Skip records without valid coordinates
                if (record.latitude === null || record.longitude === null) {
                    return null;
                }

                const isHighlighted = highlightedRecordId === record.id;
                const color = getValidationColor(record);
                const label = formatRecordLabel(record);
                const baseRadius = MARKER_CONFIG.baseRadius;
                const radius = isHighlighted ? baseRadius + 4 : baseRadius;

                const commonEventHandlers = {
                    mouseover: () => onRecordHover?.(record.id),
                    mouseout: () => onRecordHover?.(null),
                    click: () => onRecordHover?.(record.id),
                };

                const commonPopup = (
                    <Popup>
                        <div>
                            <strong>ID: {record.id}</strong><br />
                            <span className="text-muted">PLADIAS</span><br />
                            {record.year && <span>Rok: {record.year}<br /></span>}
                            {record.recordAuthorsNames && (
                                <span>Sběratel: {record.recordAuthorsNames}<br /></span>
                            )}
                            <a href={`/atlas/record/${record.id}`} target="_blank" rel="noopener noreferrer">
                                Otevřít záznam
                            </a>
                        </div>
                    </Popup>
                );

                return (
                    <>
                        {record.gpsPrecision !== null && record.gpsPrecision! > 0 && (
                            <Circle
                                key={`precision-${record.id}`}
                                center={[record.latitude, record.longitude]}
                                radius={record.gpsPrecision! / 2}
                                pathOptions={{
                                    color: MARKER_CONFIG.strokeColor,
                                    fillColor: color,
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
                                color: MARKER_CONFIG.strokeColor,
                                fillColor: color,
                                fillOpacity: isHighlighted ? 0.9 : 0.6,
                                weight: 2
                            }}
                            eventHandlers={commonEventHandlers}
                        >
                            {label && (
                                <Tooltip permanent direction="top" offset={[0, -16]} className="record-label-transparent">
                                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap', color: '#000', fontWeight: 700, textShadow: '0 0 2px #fff, 0 0 2px #fff' }}>
                                        {label}
                                    </span>
                                </Tooltip>
                            )}
                            {commonPopup}
                        </CircleMarker>
                    </>
                );
            })}
        </>
    );
}

export default PladiasRecordMarkers;

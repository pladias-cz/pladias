import {Button, Card, Form, Table} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';
import type {ReverseGeocodingResponse} from '@/models/ReverseGeocoding';
import type {TownHierarchyEntry} from '@/models/GeoTypes';
import {parseCoordinatePair} from '@/core/coordinates/coordinateParsing';
import {useState} from 'react';

interface RecordLocationProps {
    record: RecordPladiasFull;
    proposedLocation?: {
        coordinates: [number, number];
        geocodeData: ReverseGeocodingResponse;
    };
    /** Běžná pole záznamu (server flag) – stejné právo jako pro klik do mapy. */
    canEdit?: boolean;
    /** Vložený a naparsovaný DMS – stránka z něj udělá návrh nové polohy. */
    onCoordinatesSubmitted?: (lat: number, lng: number) => void;
}

function toDMS(value: number, isLatitude: boolean): string {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesDecimal = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = (minutesDecimal - minutes) * 60;

    const direction = isLatitude
        ? value >= 0 ? 'N' : 'S'
        : value >= 0 ? 'E' : 'W';

    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`;
}

/**
 * Vložení souřadnic do sloupce „Nová pozice“ – jeden vzhled pro GPS (desetinné)
 * i DMS řádek; parser i odeslání jsou společné, liší se jen placeholder.
 */
const CoordinatePairInput = ({value, error, placeholder, onChange, onSubmit}: {
    value: string;
    error: string | null;
    placeholder: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
}) => {
    const {t} = useTranslation();
    return (
        <>
            <div className="d-flex gap-1">
                <Form.Control
                    as="input"
                    size="sm"
                    isInvalid={!!error}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onSubmit();
                        }
                    }}
                    placeholder={placeholder}
                    aria-label={placeholder}
                />
                <Button size="sm" variant="outline-primary" onClick={onSubmit} disabled={!value.trim()}>
                    {t('record.coordsInsert')}
                </Button>
            </div>
            {error && <Form.Text className="text-danger">{error}</Form.Text>}
        </>
    );
};

function formatTownHierarchy(townHierarchy?: TownHierarchyEntry[]): string {
    if (!townHierarchy || townHierarchy.length === 0) {
        return '-';
    }
    return townHierarchy.map(entry => {
        const town = entry.town;
        const districtTypeName = town.districtType?.name;
        return districtTypeName ? `${districtTypeName}: ${town.name}` : town.name;
    }).join(', ');
}

function formatPhytochorions(
    phytochorions?: Array<{ phytochorion: { phytoId: string; detailedName: string } }>,
    originalPhytoId?: string | null
): string {
    if (!phytochorions || phytochorions.length === 0) {
        return '-';
    }

    // Check if there's exactly one proposed phytochorion and it matches the original
    if (phytochorions.length === 1 && originalPhytoId) {
        const proposedPhytoId = phytochorions[0].phytochorion.phytoId;
        if (originalPhytoId === proposedPhytoId) {
            const name = phytochorions[0].phytochorion.detailedName;
            return `Záznam zůstane i po přesunu ve stejném fytochorionu (${name}).`;
        }
    }

    // Multiple proposals or different phytochorion
    const names = phytochorions.map(entry => entry.phytochorion.detailedName).join(', ');
    return `Záznam bude přesunut do fytochorionu ${names}. V případě výskytu při hranicích fytochorionů lze fytogeograficky lépe vyhovující fytochorion zvolit v okně Editovatelná pole`;
}

export default function RecordLocation({record, proposedLocation, canEdit, onCoordinatesSubmitted}: RecordLocationProps) {
    const {t} = useTranslation();
    const [dmsInput, setDmsInput] = useState('');
    const [dmsError, setDmsError] = useState<string | null>(null);
    const [gpsInput, setGpsInput] = useState('');
    const [gpsError, setGpsError] = useState<string | null>(null);

    const proposedCoords = proposedLocation?.coordinates;
    const geocodeData = proposedLocation?.geocodeData;

    const submitDms = () => {
        const parsed = parseCoordinatePair(dmsInput);
        if (!parsed) {
            setDmsError(t('record.coordsParseFailed'));
            return;
        }
        setDmsError(null);
        setDmsInput('');
        onCoordinatesSubmitted?.(parsed.lat, parsed.lon);
    };

    const submitGps = () => {
        const parsed = parseCoordinatePair(gpsInput);
        if (!parsed) {
            setGpsError(t('record.coordsParseFailed'));
            return;
        }
        setGpsError(null);
        setGpsInput('');
        onCoordinatesSubmitted?.(parsed.lat, parsed.lon);
    };

    return (
        <Card>
            <Card.Header>
                <strong>{t('record.position')}</strong>
            </Card.Header>
            <Card.Body>
                <Table className="table-sm">
                    <thead>
                    <tr>
                        <th></th>
                        <th>{t('record.actualPosition')}</th>
                        <th>{t('record.newPosition')}</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <td className="text-muted small">GPS</td>
                        <td>{record.latitude?.toFixed(6) ?? '-'} {record.longitude?.toFixed(6) ?? '-'}</td>
                        <td className="text-primary">
                            {proposedCoords ? (
                                <>
                                    {proposedCoords[0].toFixed(6)} {proposedCoords[1].toFixed(6)}
                                </>
                            ) : (canEdit && onCoordinatesSubmitted ? (
                                <CoordinatePairInput
                                    value={gpsInput}
                                    error={gpsError}
                                    placeholder={t('record.gpsPlaceholder')}
                                    onChange={setGpsInput}
                                    onSubmit={submitGps}
                                />
                            ) : '-')}
                        </td>
                    </tr>
                    <tr>
                        <td className="text-muted small">DMS</td>
                        <td>{record.longitude && record.latitude
                            ? `${toDMS(record.latitude, true)}, ${toDMS(record.longitude, false)}`
                            : '-'}</td>
                        <td className="text-primary">
                            {proposedCoords ? (
                                toDMS(proposedCoords[0], true) + ', ' + toDMS(proposedCoords[1], false)
                            ) : (canEdit && onCoordinatesSubmitted ? (
                                <CoordinatePairInput
                                    value={dmsInput}
                                    error={dmsError}
                                    placeholder={t('record.dmsPlaceholder')}
                                    onChange={setDmsInput}
                                    onSubmit={submitDms}
                                />
                            ) : '-')}
                        </td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t('record.coordsOrigin')}</td>
                        <td>{record.gpsCoordsSource}</td>
                        <td className="text-primary">{proposedCoords ? (
                            'Upřesněno v Pladias'
                        ) : '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t('record.coordsPrecision')}</td>
                        <td>{record.gpsPrecision}</td>
                        <td className="text-primary">{proposedCoords ? (
                            'Vyplňte níže'
                        ) : '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t('record.nearestTownComputed')}</td>
                        <td>{record.nearestTownName}</td>
                        <td className="text-primary">{geocodeData ? formatTownHierarchy(geocodeData.townHierarchy) : '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t('record.district')}</td>
                        <td>{record.districtComputed} </td>
                        <td className="text-primary">{geocodeData?.district?.name ?? '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t('record.quadrant')}</td>
                        <td>{record.quadrantCodeComputed}</td>
                        <td className="text-primary">{geocodeData?.quadrant?.code ?? '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t('record.phytochorion')}</td>
                        <td>{record.phytochorionRelationName}</td>
                        <td className="text-primary">{geocodeData ? formatPhytochorions(geocodeData.phytochorions, record.phytochorionPhytoId) : '-'}</td>
                    </tr>
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
}

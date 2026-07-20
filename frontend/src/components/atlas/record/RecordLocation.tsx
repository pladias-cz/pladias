import {Card, Table} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type { RecordPladiasFull } from '@/models/RecordPladiasFull';
import type { ReverseGeocodingResponse } from '@/models/ReverseGeocoding';
import type { TownHierarchyEntry } from '@/models/GeoTypes';
// import RecordInlineField from "./RecordInlineField";
// import {useRecordPermissions} from "./editors";
// import {useRecordUpdates} from "./hooks/useRecordUpdates";

interface RecordLocationProps {
    record: RecordPladiasFull;
    proposedLocation?: {
        coordinates: [number, number];
        geocodeData: ReverseGeocodingResponse;
    };
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
    phytochorions?: Array<{phytochorion: {phytoId: string; detailedName: string}}>,
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

export default function RecordLocation({record, proposedLocation}: RecordLocationProps) {
    const {t} = useTranslation();
    // const {canEdit} = useRecordPermissions(record);
    // const {updateField} = useRecordUpdates();

    const proposedCoords = proposedLocation?.coordinates;
    const geocodeData = proposedLocation?.geocodeData;

    return (
        <Card>
            <Card.Header>
                <strong>{t("record.location")}</strong>
            </Card.Header>
            <Card.Body>
                <Table className="table-sm">
                    <thead>
                    <tr>
                        <th></th>
                        <th>{t("record.actualPosition")}</th>
                        <th>{t("record.newPosition")}</th>
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
                            ) : '-'}
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
                            ) : '-'}
                        </td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t("record.coordsOrigin")}</td>
                        <td>{record.gpsCoordsSource}</td>
                        <td className="text-primary">{proposedCoords ? (
                            'Upřesněno v Pladias'
                        ) : '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t("record.coordsPrecision")}</td>
                        <td>{record.gpsPrecision}</td>
                        <td className="text-primary">{proposedCoords ? (
                            'Vyplňte níže'
                        ) : '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t("record.nearestTownComputed")}</td>
                        <td>{record.nearestTownName}</td>
                        <td className="text-primary">{geocodeData ? formatTownHierarchy(geocodeData.townHierarchy) : '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t("record.district")}</td>
                        <td>{record.districtComputed} </td>
                        <td className="text-primary">{geocodeData?.district?.name ?? '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t("record.quadrant")}</td>
                        <td>{record.quadrantCodeComputed}</td>
                        <td className="text-primary">{geocodeData?.quadrant?.code ?? '-'}</td>
                    </tr>
                    <tr>
                        <td className="text-muted small">{t("record.phytochorion")}</td>
                        <td>{record.phytochorionRelationName}</td>
                        <td className="text-primary">{geocodeData ? formatPhytochorions(geocodeData.phytochorions, record.phytochorionPhytoId) : '-'}</td>
                    </tr>
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
}

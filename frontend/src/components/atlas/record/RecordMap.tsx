import {Card} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useCallback, useState} from 'react';
import {MapContainer, TileLayer, Marker, useMap, useMapEvents} from 'react-leaflet';
import {Icon} from 'leaflet';
import type {LatLngExpression} from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerIconRed from '@/assets/markers/marker-icon-red.png';
import markerIcon2xRed from '@/assets/markers/marker-icon-2x-red.png';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';
import type {ReverseGeocodingResponse} from '@/models/ReverseGeocoding';
import {reverseGeocode} from '@/services/recordApi';
import {logError, logInfo} from '@/services/logger';
import {useRecordPermissions} from './';

// Red marker icon for the proposed location – images bundled locally (color
// variants of the standard Leaflet markers, https://github.com/pointhi/leaflet-color-markers,
// BSD-2-Clause); CSP img-src 'self' blocks loading images from external CDNs.
const proposedLocationIcon = new Icon({
    iconUrl: markerIconRed,
    iconRetinaUrl: markerIcon2xRed,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

/**
 * Posun mapy na návrh nové polohy. `MapContainer` bere `center` jen při mountu
 * (react-leaflet `mapRef` callback má prázdné závislosti), takže k posunu musíme
 * zavolat `setView` sami z vnitřku kontextu. Reagujeme na `version`, ne na souřadnice:
 * opakovaný návrh do stejného bodu má být také vidět (marker i přesun).
 */
function ProposalRecenter({coordinates, version, zoom}: {
    coordinates: [number, number];
    version: number;
    zoom: number;
}) {
    const map = useMap();
    const [lastVersion, setLastVersion] = useState(0);

    if (version !== lastVersion) {
        setLastVersion(version);
        map.setView(coordinates, zoom);
    }

    return null;
}

interface RecordMapProps {
    record: RecordPladiasFull;
    onLocationSelectWithGeocode?: (lat: number, lng: number, data: ReverseGeocodingResponse) => void;
    /** Návrh nové polohy ze stránky – zdroj pravdy pro marker i posun mapy. */
    proposedLocation?: {
        coordinates: [number, number];
        version: number;
    };
}

interface MapClickHandlerProps {
    onLocationSelect: (lat: number, lng: number) => void;
    canEdit: boolean;
}

function MapClickHandler({onLocationSelect, canEdit}: MapClickHandlerProps) {
    useMapEvents({
        click(e) {
            if (canEdit) {
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    return null;
}

const defaultIcon = new Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export default function RecordMap({record, onLocationSelectWithGeocode, proposedLocation}: RecordMapProps) {
    const {t} = useTranslation();
    const {canEditCommonFields: canEdit} = useRecordPermissions(record);

    const center: [number, number] = proposedLocation?.coordinates ??
        (record.latitude && record.longitude ? [record.latitude, record.longitude] : [49.8, 15.5]);

    const fetchReverseGeocoding = useCallback(async (lat: number, lng: number) => {
        try {
            // backend vrací pole objektů ([{success}, {quadrant}, …]);
            // recordApi je slučuje do jediné ReverseGeocodingResponse
            const mergedData = await reverseGeocode(lat, lng);

            if (onLocationSelectWithGeocode) {
                onLocationSelectWithGeocode(lat, lng, mergedData);
            }
        } catch (error) {
            logError(error, {source: 'RecordMap', action: 'reverseGeocoding'});
        }
    }, [onLocationSelectWithGeocode]);

    const handleLocationSelect = useCallback((lat: number, lng: number) => {
        logInfo('Location selected', {source: 'RecordMap', lat, lng});
        fetchReverseGeocoding(lat, lng);
    }, [fetchReverseGeocoding]);

    return (
        <Card className="mb-3">
            <Card.Header>
                <a href={`/atlas/mapDetail/${record.taxon.id}/${record.quadrantCodeComputed?.slice(0, 4) ?? ''}`}
                   className="small ms-2 fs-5">
                    {t('atlas.mapDetail.back2DetailMap')}
                </a>
                {canEdit && <span className="ms-2 text-muted">({t('record.clickOnMap')})</span>}
            </Card.Header>
            <Card.Body className="p-0">
                <div style={{height: '500px', width: '100%'}}>
                    <MapContainer
                        center={center}
                        zoom={13}
                        scrollWheelZoom={true}
                        style={{height: '100%', width: '100%'}}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapClickHandler onLocationSelect={handleLocationSelect} canEdit={canEdit}/>
                        {/* Návrh (klik nebo DMS) je jediná vrstva navíc – kreslí se z návrhu, ne z lokálního stavu */}
                        {canEdit && proposedLocation &&
                            <Marker position={proposedLocation.coordinates as LatLngExpression}
                                    icon={proposedLocationIcon}/>}
                        {!proposedLocation && record.latitude && record.longitude && (
                            <Marker position={[record.latitude, record.longitude]} icon={defaultIcon}/>
                        )}
                        {proposedLocation && (
                            <ProposalRecenter coordinates={proposedLocation.coordinates}
                                              version={proposedLocation.version}
                                              zoom={13}/>
                        )}
                    </MapContainer>
                </div>
            </Card.Body>
        </Card>
    );
}

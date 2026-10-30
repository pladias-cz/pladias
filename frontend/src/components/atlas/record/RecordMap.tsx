import {Card} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useState, useCallback} from 'react';
import {MapContainer, TileLayer, Marker, Popup, useMapEvents} from 'react-leaflet';
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

interface RecordMapProps {
    record: RecordPladiasFull;
    onLocationSelectWithGeocode?: (lat: number, lng: number, data: ReverseGeocodingResponse) => void;
    hasProposedLocation?: boolean;
}

interface MapClickHandlerProps {
    onLocationSelect: (lat: number, lng: number) => void;
    showIndicator?: boolean;
    indicatorPosition?: [number, number];
    canEdit: boolean;
}

function MapClickHandler({onLocationSelect, showIndicator, indicatorPosition, canEdit}: MapClickHandlerProps) {
    useMapEvents({
        click(e) {
            if (canEdit) {
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    return showIndicator && indicatorPosition ? (
        <Marker position={indicatorPosition as LatLngExpression}>
            <Popup>New location (click map again to change)</Popup>
        </Marker>
    ) : null;
}

const defaultIcon = new Icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export default function RecordMap({record, onLocationSelectWithGeocode, hasProposedLocation}: RecordMapProps) {
    const {t} = useTranslation();
    const {canEditCommonFields: canEdit} = useRecordPermissions(record);

    const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
    const [clickDetected, setClickDetected] = useState(false);

    // Sync with external proposed location state – render-phase update guarded
    // by comparison (React docs: adjusting state when a prop changes, without an effect):
    // cancelling the proposal clears the selection, (re)proposing keeps it.
    const [prevHasProposedLocation, setPrevHasProposedLocation] = useState(hasProposedLocation);
    if (hasProposedLocation !== prevHasProposedLocation) {
        setPrevHasProposedLocation(hasProposedLocation);
        if (!hasProposedLocation) {
            setSelectedLocation(null);
            setClickDetected(false);
        }
    }

    const center: [number, number] = selectedLocation ||
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
        setClickDetected(true);
        setSelectedLocation([lat, lng]);
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
                        <MapClickHandler
                            onLocationSelect={handleLocationSelect}
                            showIndicator={clickDetected && canEdit}
                            indicatorPosition={selectedLocation || undefined}
                            canEdit={canEdit}
                        />
                        {selectedLocation && canEdit &&
                            <Marker position={selectedLocation} icon={proposedLocationIcon}/>}
                        {!selectedLocation && record.latitude && record.longitude && (
                            <Marker position={[record.latitude, record.longitude]} icon={defaultIcon}/>
                        )}
                    </MapContainer>
                </div>
            </Card.Body>
        </Card>
    );
}

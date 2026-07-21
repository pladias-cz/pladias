import {Card} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {useState, useCallback, useEffect} from "react";
import {MapContainer, TileLayer, Marker, Popup, useMapEvents} from 'react-leaflet';
import {Icon} from 'leaflet';
import type {LatLngExpression} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { RecordPladiasFull } from '@/models/RecordPladiasFull';
import type { ReverseGeocodingResponse } from '@/models/ReverseGeocoding';
import {useRecordPermissions} from "./";

// Create a red marker icon for proposed location
const proposedLocationIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
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
    const {canEdit} = useRecordPermissions(record);

    const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
    const [clickDetected, setClickDetected] = useState(false);

    // Sync with external proposed location state
    useEffect(() => {
        if (!hasProposedLocation) {
            // Clear selection when proposal is cancelled
            setSelectedLocation(null);
            setClickDetected(false);
        }
    }, [hasProposedLocation]);

    const center: [number, number] = selectedLocation ||
        (record.latitude && record.longitude ? [record.latitude, record.longitude] : [49.8, 15.5]);

    const fetchReverseGeocoding = useCallback(async (lat: number, lng: number) => {
        try {
            const response = await fetch(`/api/react/query/reverseGeocoding/lon/${lng}/lat/${lat}`);
            const data = await response.json();

            // The backend returns an array of objects like:
            // [{success: true}, {quadrant: {...}}, {district: {...}}, {townHierarchy: [...]}, {phytochorions: [...]}]
            // We need to merge all non-success objects into a single object
            const mergedData: ReverseGeocodingResponse = {};
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (item.success !== undefined) continue; // Skip success flag
                    // Merge each object's properties into mergedData
                    Object.assign(mergedData, item);
                }
            }

            if (onLocationSelectWithGeocode) {
                onLocationSelectWithGeocode(lat, lng, mergedData);
            }
        } catch (error) {
            console.error('Failed to fetch reverse geocoding:', error);
        }
    }, [onLocationSelectWithGeocode]);

    const handleLocationSelect = useCallback((lat: number, lng: number) => {
        console.log('Location selected:', lat, lng);
        setClickDetected(true);
        setSelectedLocation([lat, lng]);
        fetchReverseGeocoding(lat, lng);
    }, [fetchReverseGeocoding]);

    return (
        <Card className="mb-3">
            <Card.Header>
                <strong>{t("record.map")}</strong>
                <a href={`/atlas/mapDetail/${record.taxon.id}/${record.quadrantCodeComputed?.slice(0, 4) ?? ""}`} className="small ms-2 fs-5">
                    zpět na mapu
                </a>
                {canEdit && <span className="ms-2 text-muted">({t("record.clickOnMap")})</span>}
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
                        {selectedLocation && canEdit && <Marker position={selectedLocation} icon={proposedLocationIcon} />}
                        {!selectedLocation && record.latitude && record.longitude && (
                            <Marker position={[record.latitude, record.longitude]} icon={defaultIcon} />
                        )}
                    </MapContainer>
                </div>
            </Card.Body>
        </Card>
    );
}

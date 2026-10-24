import {useMemo, useEffect, useRef} from 'react';
import {useMap} from 'react-leaflet';
import {useQuery} from '@tanstack/react-query';
import {getSquareInfo, type SquareValidationStatus, type CurrentSquareInfo} from '@/services/atlasApi';
import {useNavigate} from 'react-router-dom';

import {useLayerManager, MapCanvas, MapLayer} from '@/core/mapLayers';
import {LayerSwitcher} from '@/core/mapLayers/components/LayerSwitcher';
import './MapComponent.scss';

// Map extent limit: 7 km from center (max bounds for user panning)
const MAX_EXTENT_KM = 7;
const KM_TO_DEGREES_LAT = 1 / 111; // 1 degree latitude ≈ 111 km

/**
 * Calculate max bounds for a given center and radius in km
 * This limits how far the user can pan the map
 */
function calculateMaxBounds(center: [number, number], radiusKm: number): [[number, number], [number, number]] {
    const [lat, lng] = center;
    const latDelta = radiusKm * KM_TO_DEGREES_LAT;
    const lngDelta = radiusKm * KM_TO_DEGREES_LAT / Math.cos((lat * Math.PI) / 180);

    return [
        [lat - latDelta, lng - lngDelta], // Southwest
        [lat + latDelta, lng + lngDelta], // Northeast
    ] as [[number, number], [number, number]];
}

/**
 * Internal component to update map center and bounds when they change
 */
function MapUpdater({center, maxBounds}: {
    center: [number, number];
    maxBounds: [[number, number], [number, number]]
}) {
    const map = useMap();

    useEffect(() => {
        // Update max bounds first
        map.setMaxBounds(maxBounds);

        // Then set the view to the new center
        map.setView(center, map.getZoom(), {animate: true});
    }, [map, center, maxBounds]);

    return null;
}

/**
 * Square info types are owned by `@/services/atlasApi`; re-exported for local use.
 */
export type {SquareValidationStatus, CurrentSquareInfo, SquareInfoResponse} from '@/services/atlasApi';

import type {RecordsByProject, RecordsByProjectMinimal} from '@/models/AtlasRecords';
import RecordMarkers from './RecordMarkers';
import PladiasRecordMarkers from './PladiasRecordMarkers';

interface MapComponentProps {
    mapName?: string;
    initialZoom?: number;
    taxonId?: number;
    squareId: string;
    records?: RecordsByProject | RecordsByProjectMinimal;
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
    onRecordHoverWithScroll?: (recordId: number) => void;
    centerOnRecord?: { latitude: number; longitude: number } | null;
}

// Define which layers this map should show and their defaults
const MAP_MAIN_LAYERS = [
    'osm',
    'opentopo',
    'ztm',
    'technical_quadrants',
    'technical_phytochorion',
    'technical_square',

    'validation_semafor',
    'validation_common_3',
    'validation_common_2',
    'validation_common_1',

];
const MAP_MAIN_DEFAULTS: Record<string, boolean> = {
    osm: true,
    opentopo: false,
    technical_quadrants: true,
    interactive_squares: true
};

// Map zoom constraints
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

// Arrow offset from edge (all arrows positioned equally from edges)
const ARROW_OFFSET = 15;
const ARROW_SIZE = 50;
const ARROW_HALF = ARROW_SIZE / 2;

/**
 * Navigation arrow component for directional square navigation
 */
function NavigationArrow({
                             status,
                             taxonId,
                         }: {
    status: SquareValidationStatus;
    taxonId?: number;
}) {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (taxonId) {
            // Use setTimeout to ensure navigation happens after current render cycle
            setTimeout(() => {
                navigate(`/atlas/mapDetail/${taxonId}/${status.squareCode}`);
            }, 0);
        }
    };

    const getRotation = (direction: string): number => {
        const rotations: Record<string, number> = {
            north: 0,
            northeast: 45,
            east: 90,
            southeast: 135,
            south: 180,
            southwest: 225,
            west: 270,
            northwest: 315
        };
        return rotations[direction] || 0;
    };

    const getPositionStyles = () => {
        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            width: `${ARROW_SIZE}px`,
            height: `${ARROW_SIZE}px`,
            cursor: 'pointer',
            padding: '0',
            backgroundColor: 'transparent',
            border: 'none',
            zIndex: 1000,
            transition: 'transform 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        };

        switch (status.direction) {
            case 'north':
                return {...baseStyle, top: `${ARROW_OFFSET}px`, left: '50%', marginLeft: `-${ARROW_HALF}px`};
            case 'northeast':
                return {...baseStyle, top: `${ARROW_OFFSET}px`, right: `${ARROW_OFFSET}px`};
            case 'east':
                return {...baseStyle, top: '50%', right: `${ARROW_OFFSET}px`, marginTop: `-${ARROW_HALF}px`};
            case 'southeast':
                return {...baseStyle, bottom: `${ARROW_OFFSET}px`, right: `${ARROW_OFFSET}px`};
            case 'south':
                return {
                    ...baseStyle,
                    bottom: `${ARROW_OFFSET}px`,
                    left: '50%',
                    marginLeft: `-${ARROW_HALF}px`,
                    zIndex: 1001
                };
            case 'southwest':
                return {...baseStyle, bottom: `${ARROW_OFFSET}px`, left: `${ARROW_OFFSET}px`};
            case 'west':
                return {...baseStyle, top: '50%', left: `${ARROW_OFFSET}px`, marginTop: `-${ARROW_HALF}px`};
            case 'northwest':
                return {...baseStyle, top: `${ARROW_OFFSET}px`, left: `${ARROW_OFFSET}px`};
            default:
                return baseStyle;
        }
    };

    return (
        <button
            className="navigation-arrow"
            onClick={handleClick}
            title={status.text}
            style={getPositionStyles()}
        >
            <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    transform: `rotate(${getRotation(status.direction)}deg)`,
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))',
                }}
            >
                <circle cx="12" cy="12" r="11" fill={status.color} stroke="#000" strokeWidth="2"/>
                <path
                    d="M12 6L12 16M12 6L8 10M12 6L16 10"
                    stroke="#000"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>
        </button>
    );
}

/**
 * Current square status indicator component
 */
function CurrentSquareIndicator({
                                    currentSquare,
                                }: {
    currentSquare: CurrentSquareInfo;
}) {
    return (
        <div
            className="current-square-indicator"
            title={`${currentSquare.squareCode}: ${currentSquare.statusText}`}
            style={{
                position: 'absolute',
                top: `${ARROW_OFFSET}px`,
                left: '50%',
                marginLeft: '30px',
                width: '120px',
                height: '40px',
                backgroundColor: currentSquare.statusColor,
                border: '2px solid #000',
                borderRadius: '20%',
                zIndex: 1000,
                cursor: 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#000',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
        >
            Aktuální čtverec: {currentSquare.squareCode}
        </div>
    );
}

export function MapComponent({
                                 mapName = 'mapDetail',
                                 initialZoom = 12,
                                 taxonId,
                                 squareId,
                                 records = {pladias: [], gbif: [], inaturalist: []},
                                 highlightedRecordId,
                                 onRecordHover,
                                 centerOnRecord,
                             }: MapComponentProps) {
    const mapRef = useRef<L.Map | null>(null);

    const allLayerIds = useMemo(() => {
        return MAP_MAIN_LAYERS;
    }, []);

    useLayerManager(mapName, MAP_MAIN_LAYERS, MAP_MAIN_DEFAULTS);

    // informace o kvadrantu (centroid, stav ověření, sousedé) – bez cache (sekce J)
    const squareCode = parseInt(squareId, 10);
    const {data: squareInfo} = useQuery({
        queryKey: ['squareInfo', squareCode, taxonId],
        queryFn: () => getSquareInfo(squareCode, taxonId!),
        enabled: taxonId !== undefined && !isNaN(squareCode),
    });

    const currentSquare = squareInfo?.currentSquare ?? null;
    const neighbors = squareInfo?.neighbors ?? [];
    const mapCenter = useMemo<[number, number] | null>(() => (
        currentSquare ? [currentSquare.latitude, currentSquare.longitude] : null
    ), [currentSquare]);
    const maxBounds = useMemo(() => (
        mapCenter ? calculateMaxBounds(mapCenter, MAX_EXTENT_KM) : null
    ), [mapCenter]);


    // Center map on specific record when requested (respecting bounds)
    useEffect(() => {
        if (centerOnRecord && mapRef.current) {
            const map = mapRef.current;
            const target = [centerOnRecord.latitude, centerOnRecord.longitude] as [number, number];
            const currentBounds = map.getBounds();

            // Check if target is already visible (within current bounds)
            const alreadyVisible = currentBounds.contains(target);

            if (!alreadyVisible) {
                // Target is outside current view, pan to it
                map.flyTo(target, map.getZoom(), {
                    duration: 0.5,
                    noMoveStart: true,
                });
            }
        }
    }, [centerOnRecord]);

    const mapContext = useMemo(() => {
        const squareCode = parseInt(squareId, 10);
        return {
            taxonId,
            squareId,
            squareCode: isNaN(squareCode) ? undefined : squareCode,
        };
    }, [taxonId, squareId]);

    if (!mapCenter) {
        return <div className="h-100 w-100 d-flex align-items-center justify-content-center">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>;
    }

    return (
        <div className="h-100 w-100" style={{position: 'relative'}}>
            {/* Current square status indicator */}
            {currentSquare && <CurrentSquareIndicator currentSquare={currentSquare}/>}

            {/* Navigation arrows */}
            {neighbors.map((neighbor) => (
                <NavigationArrow
                    key={neighbor.direction}
                    status={neighbor}
                    taxonId={taxonId}
                />
            ))}

            <MapCanvas
                center={mapCenter}
                zoom={initialZoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                mapKey={squareId}
                mapRef={mapRef}
            >
                {mapCenter && maxBounds && (
                    <MapUpdater center={mapCenter} maxBounds={maxBounds}/>
                )}

                {MAP_MAIN_LAYERS.map(layerId => (
                    <MapLayer
                        key={layerId}
                        layerId={layerId}
                        mapName={mapName}
                        params={mapContext}
                    />
                ))}

                {records && (records.pladias?.length > 0) && (
                    <PladiasRecordMarkers
                        records={records.pladias}
                        highlightedRecordId={highlightedRecordId}
                        onRecordHover={onRecordHover}
                    />
                )}

                {records && ((records.gbif?.length > 0 || records.inaturalist?.length > 0)) && (
                    <RecordMarkers
                        records={[...(records.gbif || []), ...(records.inaturalist || [])]}
                        highlightedRecordId={highlightedRecordId}
                        onRecordHover={onRecordHover}
                    />
                )}
            </MapCanvas>

            <LayerSwitcher
                mapName={mapName}
                layerIds={allLayerIds}
                defaultVisibility={MAP_MAIN_DEFAULTS}
            />
        </div>
    );
}

export default MapComponent;

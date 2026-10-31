/**
 * Mapový editor polygonu filtru „je v polygonu": mapa ČR (MapCanvas + osm
 * podklad jako ResultsMap), klikáním do mapy se přidávají vrcholy, polygon
 * se uzavírá tlačítkem (min. 3 vrcholy) a přenáší jako WKT (lon lat, SRID
 * 4326) do onChange + commituje vyhledávání. Po uzavření se klikání do mapy
 * ignoruje – polygon lze vymazat a nakreslit znovu. Stav se inicializuje z
 * WKT hodnoty filtru (popover se po zavření/otevření mountuje znovu).
 */

import {useState} from 'react';
import {Button} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {CircleMarker, Polygon, Polyline, useMapEvents} from 'react-leaflet';
import {Layer, MapCanvas} from '@/core/mapLayers';
import {MIN_POLYGON_POINTS, polygonToWkt, wktToPolygon, type PolygonPoint} from './polygonWkt';

interface PolygonMapEditorProps {
    /** Hodnota filtru – WKT polygonu (prázdný řetězec = nenakresleno). */
    value: string;
    onChange: (wkt: string) => void;
    /** Uzavření / vymazání polygonu – spouštěč vyhledávání. */
    onCommit?: () => void;
}

interface EditorState {
    points: PolygonPoint[];
    closed: boolean;
}

/** Zachytává kliky do mapy – dokud není polygon uzavřen, přidávají se vrcholy. */
function MapClickCatcher({disabled, onAdd}: {disabled: boolean; onAdd: (point: PolygonPoint) => void}) {
    useMapEvents({
        click(event) {
            if (!disabled) {
                onAdd([event.latlng.lat, event.latlng.lng]);
            }
        },
    });
    return null;
}

export function PolygonMapEditor({value, onChange, onCommit}: PolygonMapEditorProps) {
    const {t} = useTranslation();

    const [state, setState] = useState<EditorState>(() => {
        const points = value ? wktToPolygon(value) : null;
        return points != null
            ? {points, closed: true}
            : {points: [], closed: false};
    });
    const {points, closed} = state;

    const addPoint = (point: PolygonPoint) => {
        setState((previous) => previous.closed ? previous : {...previous, points: [...previous.points, point]});
    };

    const finish = () => {
        const wkt = polygonToWkt(points);
        if (wkt == null) {
            return;
        }
        setState({points, closed: true});
        onChange(wkt);
        // uzavřený polygon = potvrzená hodnota → hledat hned
        onCommit?.();
    };

    const undo = () => {
        setState((previous) => ({...previous, points: previous.points.slice(0, -1)}));
    };

    const clear = () => {
        setState({points: [], closed: false});
        onChange('');
        onCommit?.();
    };

    const vertexOptions = {color: '#356636', fillColor: '#356636', fillOpacity: 0.9, weight: 1};

    return (
        <div className="polygon-map-editor">
            <p className="small text-muted mb-2">{t('atlas.advancedSearch.polygon.hint')}</p>
            <div className="polygon-map-editor__map">
                <MapCanvas center={[49.8, 15.7]} zoom={7} minZoom={6} maxZoom={13}>
                    <Layer layerId="osm"/>
                    <MapClickCatcher disabled={closed} onAdd={addPoint}/>
                    {closed ? (
                        <Polygon
                            positions={points}
                            pathOptions={{color: '#356636', fillColor: '#356636', fillOpacity: 0.25}}
                        />
                    ) : (
                        <>
                            {points.length > 0 && (
                                <Polyline positions={points} pathOptions={{color: '#356636', dashArray: '4 4'}}/>
                            )}
                            {points.map((point, index) => (
                                <CircleMarker
                                    key={`${point[0]},${point[1]}#${index}`}
                                    center={point}
                                    radius={index === 0 ? 6 : 4}
                                    pathOptions={vertexOptions}
                                />
                            ))}
                        </>
                    )}
                </MapCanvas>
            </div>
            <div className="d-flex gap-2 mt-2">
                {!closed && (
                    <>
                        <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={undo}
                            disabled={points.length === 0}
                        >
                            {t('atlas.advancedSearch.polygon.undo')}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={finish}
                            disabled={points.length < MIN_POLYGON_POINTS}
                        >
                            {t('atlas.advancedSearch.polygon.finish')}
                        </Button>
                    </>
                )}
                {(points.length > 0 || closed) && (
                    <Button size="sm" variant="outline-secondary" onClick={clear}>
                        {t('atlas.advancedSearch.polygon.clear')}
                    </Button>
                )}
            </div>
        </div>
    );
}
/**
 * Mapový výpis výsledků vyhledávání: mřížka (squares + kvadranty) z registru vrstev
 * stejně jako v mapovém náhledu taxonu (MapPreview) a nad ní markery – centroidech
 * kvadrantů zastoupených v CELÉM výsledku hledání (agregace na backendu, nezávisle
 * na stránkování). Načítá se lazy: komponenta se mountuje až při prvním překliknutí
 * na tab Mapa (mountOnEnter v ResultsTabs) a data drží useQuery klíčované payloadem –
 * nové hledání změní klíč a dotaz se refetche, i když uživatel zůstane na mapě.
 */

import {useMemo} from 'react';
import {Alert, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {CircleMarker, Tooltip} from 'react-leaflet';
import {Layer, MapCanvas} from '@/core/mapLayers';
import {searchQuadrants} from '@/services/searchApi';
import {buildSearchFormData} from '../searchRequest';
import type {SearchPayloadEntries} from '../hooks/useSearchQuery';

/** Vrstvy jako v MapPreview: podklad + mřížka kvadrantů + interaktivní čtverce. */
const GRID_LAYERS = ['osm', 'technical_quadrants', 'interactive_squares'];

interface ResultsMapProps {
    /** Filtry posledního hledání (query.lastPayloadEntries) – tentýž payload jako tabulkový výpis. */
    payloadEntries: SearchPayloadEntries;
}

export function ResultsMap({payloadEntries}: ResultsMapProps) {
    const {t} = useTranslation();

    // FormData i klíč dotazu se musí memoizovat – jinak by každý render vytvořil
    // novou instanci a přegeneroval dotaz (a u WFS vrstvy nový request).
    const formData = useMemo(
        () => buildSearchFormData(payloadEntries, null, 'asc'),
        [payloadEntries],
    );
    const payloadKey = useMemo(() => JSON.stringify(payloadEntries), [payloadEntries]);

    const {data: quadrants, isLoading, error} = useQuery({
        queryKey: ['searchQuadrants', payloadKey],
        queryFn: () => searchQuadrants(formData),
        enabled: payloadEntries.length > 0,
    });

    return (
        <div className="mt-3">
            {error && (
                <Alert variant="danger">
                    {t('atlas.advancedSearch.map.loadFailed')}
                </Alert>
            )}
            {!error && !isLoading && quadrants != null && quadrants.length === 0 && (
                <Alert variant="info">
                    {t('atlas.advancedSearch.map.noResults')}
                </Alert>
            )}
            <div className="position-relative" style={{height: '70vh', minHeight: '480px'}}>
                <MapCanvas center={[49.8, 15.7]} zoom={7} minZoom={6} maxZoom={11}>
                    {GRID_LAYERS.map((layerId) => (
                        <Layer key={layerId} layerId={layerId}/>
                    ))}
                    {quadrants?.map((quadrant) => (
                        <CircleMarker
                            key={quadrant.id}
                            center={[quadrant.lat, quadrant.lon]}
                            radius={3}
                            pathOptions={{color: '#000', fillColor: '#000', fillOpacity: 0.85, weight: 1}}
                        >
                            <Tooltip>
                                {quadrant.code}
                                {quadrant.recordsCount != null && (
                                    ` – ${t('atlas.advancedSearch.map.recordsCount', {count: quadrant.recordsCount})}`
                                )}
                            </Tooltip>
                        </CircleMarker>
                    ))}
                </MapCanvas>
                {isLoading && (
                    <div
                        className="position-absolute top-50 start-50 translate-middle bg-white rounded p-2 shadow"
                        style={{zIndex: 1200}}
                    >
                        <Spinner animation="border" role="status" variant="secondary">
                            <span className="visually-hidden">{t('common.loading')}</span>
                        </Spinner>
                    </div>
                )}
            </div>
        </div>
    );
}

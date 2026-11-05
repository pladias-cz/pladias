/**
 * Testy mapového editoru polygonu (filtr „je v polygonu"): přidávání vrcholů
 * klikáním do mapy, uzavření polygonu tlačítkem (onChange s WKT + commit),
 * Zpět/Vymazat a inicializace z WKT hodnoty filtru. Mapové komponenty
 * (MapCanvas/Layer z core/mapLayers, Polygon/Polyline/CircleMarker/
 * useMapEvents z react-leaflet) jsou mocknuté – v jsdom mapa jako taková
 * neběží; handler useMapEvents se zachycuje a vyvolává ručně.
 */

import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import '@/i18n/i18n';
import {PolygonMapEditor} from './PolygonMapEditor';

type MapEvent = {latlng: {lat: number; lng: number}};
const mapHandlers: {current: {click?: (event: MapEvent) => void}} = {current: {}};

vi.mock('react-leaflet', () => ({
    useMapEvents: (handlers: Record<string, unknown>) => {
        mapHandlers.current = handlers as {click?: (event: MapEvent) => void};
        return null;
    },
    Polygon: ({positions}: {positions: number[][]}) => (
        <div data-testid="polygon" data-points={JSON.stringify(positions)}/>
    ),
    Polyline: () => <div data-testid="polyline"/>,
    CircleMarker: ({center}: {center: number[]}) => (
        <div data-testid="vertex" data-center={JSON.stringify(center)}/>
    ),
}));

vi.mock('@/core/mapLayers', () => ({
    MapCanvas: ({children}: {children?: React.ReactNode}) => (
        <div data-testid="map-canvas">{children}</div>
    ),
    Layer: () => <div data-testid="layer-osm"/>,
}));

const clickMap = (lat: number, lng: number) => {
    act(() => {
        mapHandlers.current.click?.({latlng: {lat, lng}});
    });
};

beforeEach(() => {
    mapHandlers.current = {};
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('PolygonMapEditor', () => {
    it('klikáním přidává vrcholy a uzavřením volá onChange s WKT + commit', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        render(<PolygonMapEditor value="" onChange={onChange} onCommit={onCommit}/>);

        expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
        expect(screen.getByText(/Klikáním do mapy přidávejte vrcholy/)).toBeInTheDocument();

        clickMap(49.5, 14.1);
        clickMap(49.6, 14.2);
        clickMap(49.4, 14.3);

        expect(screen.getAllByTestId('vertex')).toHaveLength(3);

        fireEvent.click(screen.getByRole('button', {name: 'Uzavřít polygon'}));

        expect(onChange).toHaveBeenCalledWith(
            'POLYGON ((14.100000 49.500000, 14.200000 49.600000, 14.300000 49.400000, 14.100000 49.500000))',
        );
        expect(onCommit).toHaveBeenCalledTimes(1);
        // uzavřený polygon se vykreslí Polygonem (ne čárkovanou linií)
        expect(screen.getByTestId('polygon')).toBeInTheDocument();
        expect(screen.queryByTestId('polyline')).toBeNull();
    });

    it('Zpět odebírá poslední vrchol; uzavřít lze až od tří vrcholů', () => {
        render(<PolygonMapEditor value="" onChange={vi.fn()}/>);

        const finish = screen.getByRole('button', {name: 'Uzavřít polygon'});
        expect(finish).toBeDisabled();

        clickMap(49.5, 14.1);
        clickMap(49.6, 14.2);
        expect(finish).toBeDisabled();

        fireEvent.click(screen.getByRole('button', {name: 'Zpět'}));
        expect(screen.getAllByTestId('vertex')).toHaveLength(1);
        expect(finish).toBeDisabled();

        clickMap(49.7, 14.3);
        clickMap(49.4, 14.3);
        expect(finish).toBeEnabled();
    });

    it('Vymazat smaže polygon a commituje prázdnou hodnotu', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        render(<PolygonMapEditor value="" onChange={onChange} onCommit={onCommit}/>);

        clickMap(49.5, 14.1);
        fireEvent.click(screen.getByRole('button', {name: 'Vymazat'}));

        expect(onChange).toHaveBeenCalledWith('');
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('vertex')).toBeNull();
    });

    it('inicializuje se z WKT hodnoty filtru (uzavřený polygon)', () => {
        render(
            <PolygonMapEditor
                value="POLYGON ((14.1 49.5, 14.2 49.6, 14.3 49.4, 14.1 49.5))"
                onChange={vi.fn()}
            />,
        );

        // uzavřený polygon rovnou vykreslený, tlačítka kreslení skrytá
        expect(screen.getByTestId('polygon')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Uzavřít polygon'})).toBeNull();
        expect(screen.getByRole('button', {name: 'Vymazat'})).toBeInTheDocument();
    });
});
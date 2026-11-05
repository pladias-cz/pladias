/**
 * Testy mapového výpisu výsledků: lazy dotaz na agregované kvadranty (useQuery
 * přes searchQuadrants s klíčem podle payloadu), vykreslení markerů po načtení
 * (včetně tooltipu s kódem a počtem záznamů), degradované stavy (chyba / prázdný
 * výsledek) a neaktivní dotaz bez payloadu.
 *
 * Mapové komponenty (MapCanvas/Layer z core/mapLayers, CircleMarker/Tooltip z
 * react-leaflet) jsou mocknuté – v jsdom mapa jako taková neběží.
 */

import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ResultsMap} from './ResultsMap';
import {withQueryClient} from '@/test/withQueryClient';
import {searchQuadrants, type SearchQuadrant} from '@/services/searchApi';
import '@/i18n/i18n';

vi.mock('@/core/mapLayers', () => ({
    MapCanvas: ({children}: {children?: React.ReactNode}) => (
        <div data-testid="map-canvas">{children}</div>
    ),
    Layer: ({layerId}: {layerId: string}) => <div data-testid={`layer-${layerId}`}/>,
}));

vi.mock('react-leaflet', () => ({
    CircleMarker: ({children}: {children?: React.ReactNode}) => (
        <div data-testid="quadrant-marker">{children}</div>
    ),
    Tooltip: ({children}: {children?: React.ReactNode}) => <>{children}</>,
}));

vi.mock('@/services/searchApi', () => ({
    searchQuadrants: vi.fn(),
}));

const quadrants: SearchQuadrant[] = [
    {id: 1, code: '6261b', lat: 49.83, lon: 15.71, recordsCount: 12},
    {id: 2, code: '6152a', lat: 49.19, lon: 15.0},
];

const payload = [['taxon_name', 'Carex']] as Array<[string, FormDataEntryValue]>;

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ResultsMap', () => {
    it('načte kvadranty celého výsledku a vykreslí markery s tooltipy', async () => {
        vi.mocked(searchQuadrants).mockResolvedValue(quadrants);
        render(withQueryClient(<ResultsMap payloadEntries={payload}/>));

        // dva markery (centroidy kvadrantů)
        expect(await screen.findAllByTestId('quadrant-marker')).toHaveLength(2);

        // tooltip: kód kvadrantu + počet záznamů; bez počtu jen kód
        expect(screen.getByText('6261b – Záznamů: 12')).toBeInTheDocument();
        expect(screen.getByText('6152a')).toBeInTheDocument();

        expect(searchQuadrants).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Načtení mapových výsledků se nezdařilo.')).toBeNull();
        expect(screen.queryByText('Ve výsledku nejsou žádné kvadranty.')).toBeNull();
    });

    it('bez payloadu se dotaz neodesílá a markery se nevykreslí', () => {
        vi.mocked(searchQuadrants).mockResolvedValue(quadrants);
        render(withQueryClient(<ResultsMap payloadEntries={[]}/>));

        expect(searchQuadrants).not.toHaveBeenCalled();
        expect(screen.queryByTestId('quadrant-marker')).toBeNull();
    });

    it('chybu dotazu zobrazí alertem (mapa s mřížkou zůstává)', async () => {
        vi.mocked(searchQuadrants).mockRejectedValue(new Error('fail'));
        render(withQueryClient(<ResultsMap payloadEntries={payload}/>));

        expect(await screen.findByText('Načtení mapových výsledků se nezdařilo.')).toBeInTheDocument();
    });

    it('prázdný výsledek zobrazí informační alert bez markerů', async () => {
        vi.mocked(searchQuadrants).mockResolvedValue([]);
        render(withQueryClient(<ResultsMap payloadEntries={payload}/>));

        expect(await screen.findByText('Ve výsledku nejsou žádné kvadranty.')).toBeInTheDocument();
        expect(screen.queryByTestId('quadrant-marker')).toBeNull();
    });
});
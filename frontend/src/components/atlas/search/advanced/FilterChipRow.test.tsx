/**
 * Testy řádky chipů filtrů: defaultní chipy podle visibleIds, hodnota ze
 * store se zobrazí na chipu, křížek maže hodnotu, tlačítko Reset volá prop,
 * zavření popoveru chipu spouští onFiltersChanged (auto-vyhledávání) a „+"
 * dropdown seskupuje filtry do sloupců podle kategorií. Store je globální –
 * mezi testy se vrací na výchozí hodnoty.
 */

import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {AutocompleteProvider} from '@/components/autocomplete/AutocompleteProvider';
import type {TaxonId} from '@/models/TaxonId';
import {withQueryClient} from '@/test/withQueryClient';
import '@/i18n/i18n';
import {FilterChipRow} from './FilterChipRow';
import {useAdvancedSearchStore} from './advancedSearchStore';
import {defaultFilterValues, FILTER_DEFINITIONS, type TypeaheadSource} from './filterRegistry';
import type {FilterId} from './types';
import type {TypeaheadOption} from '../types';

/** Zachycený handler kliku mapy editoru polygonu (mock react-leaflet). */
type MapEvent = {latlng: {lat: number; lng: number}};
const mapHandlers: {current: {click?: (event: MapEvent) => void}} = {current: {}};

vi.mock('react-leaflet', () => ({
    useMapEvents: (handlers: Record<string, unknown>) => {
        mapHandlers.current = handlers as {click?: (event: MapEvent) => void};
        return null;
    },
    Polygon: () => <div data-testid="polygon"/>,
    Polyline: () => <div data-testid="polyline"/>,
    CircleMarker: () => <div data-testid="vertex"/>,
}));

vi.mock('@/core/mapLayers', () => ({
    MapCanvas: ({children}: {children?: React.ReactNode}) => (
        <div data-testid="map-canvas">{children}</div>
    ),
    Layer: () => <div data-testid="layer-osm"/>,
}));

const taxonProvider: AutocompleteProvider<TaxonId> = {
    search: async () => [],
    label: (taxon) => taxon.nameLat,
    placeholder: 'taxon',
};

const emptyOptions: Record<TypeaheadSource, TypeaheadOption[]> = {
    phytochorions: [],
    herbariums: [],
    institutions: [],
    projects: [],
    committers: [],
    historyFlags: [],
    licenses: [],
    validationStatus: [],
};

const baseProps = {
    filters: FILTER_DEFINITIONS.filter((filter) => !filter.companionOf),
    visibleIds: ['taxonName', 'localityDescription', 'year'] as FilterId[],
    onToggleVisibility: vi.fn(),
    onFiltersChanged: vi.fn(),
    taxonProvider,
    optionsBySource: emptyOptions,
    isLoading: false,
    onReset: vi.fn(),
};

beforeEach(() => {
    useAdvancedSearchStore.setState({values: defaultFilterValues()});
    mapHandlers.current = {};
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('FilterChipRow', () => {
    it('vykreslí chipy viditelných filtrů; bez hodnoty bez křížku', () => {
        render(<FilterChipRow {...baseProps}/>);

        expect(screen.getByRole('button', {name: 'taxon'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'lokalita'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'rok nálezu'})).toBeInTheDocument();
        // chip nese modifier barvy své kategorie (stroke)
        expect(screen.getByRole('button', {name: 'taxon'}).closest('.filter-chip')).toHaveClass('filter-chip--taxon');
        expect(screen.queryByRole('button', {name: 'Vymazat hodnotu filtru'})).toBeNull();
    });

    it('chip zobrazí hodnotu ze store; křížek hodnotu smaže', () => {
        useAdvancedSearchStore.setState({values: {...defaultFilterValues(), localityDescription: 'Šumava'}});
        render(<FilterChipRow {...baseProps}/>);

        expect(screen.getByRole('button', {name: 'lokalita: Šumava'})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Vymazat hodnotu filtru'}));

        expect(useAdvancedSearchStore.getState().values.localityDescription).toBeUndefined();
    });

    it('tlačítko Reset volá prop', () => {
        render(<FilterChipRow {...baseProps}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Reset'}));

        expect(baseProps.onReset).toHaveBeenCalledTimes(1);
    });

    it('chipy řadí podle pořadí kategorií jako „+" popover (ne podle registru)', () => {
        // registry pořadí: obec (locality), poznámka (remarks), rok nálezu (origin)
        // – kategoricky správně: lokalita → původ dat → poznámky
        render(<FilterChipRow {...baseProps} visibleIds={['town', 'comment', 'year']}/>);

        const chipLabels = Array.from(document.querySelectorAll('.filter-chip__button'))
            .map((button) => button.textContent);

        expect(chipLabels).toEqual(['obec', 'rok nálezu', 'poznámka']);
    });

    it('zavření popoveru chipu (najetí a odjetí myší) volá onFiltersChanged', async () => {
        // popover otevře i Autocomplete taxonu → potřebuje QueryClient (withQueryClient)
        render(withQueryClient(<FilterChipRow {...baseProps}/>));

        const chip = screen.getByRole('button', {name: 'taxon'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);
        fireEvent.mouseLeave(chip);

        // popover se zavře až po CLOSE_DELAY_MS (150 ms) → onFiltersChanged
        await waitFor(() => expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(1));
    });

    it('klik do vstupu v popoveru chipu ho nezavře (mousedown + click jako v prohlížeči)', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps}/>));

        const chip = screen.getByRole('button', {name: 'taxon'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        // popover s autocomplete taxonu je v DOM (portál na body); placeholder
        // vstupu pochází z taxonProvidera ('taxon')
        const input = await screen.findByPlaceholderText('taxon');
        fireEvent.mouseDown(input);
        fireEvent.click(input);

        expect(input).toBeInTheDocument();
    });

    it('hover chipu focusne vstup otevřeného popoveru', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps}/>));

        const chip = screen.getByRole('button', {name: 'taxon'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const input = await screen.findByPlaceholderText('taxon');
        await waitFor(() => expect(input).toHaveFocus());
    });

    it('přeběh myší mezi chipy přenáší focus na vstup nového popoveru', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps}/>));

        const taxonChip = screen.getByRole('button', {name: 'taxon'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(taxonChip);
        const taxonInput = await screen.findByPlaceholderText('taxon');
        await waitFor(() => expect(taxonInput).toHaveFocus());

        // přeběh do sousedního chipu: popover taxonu se zavře až po
        // CLOSE_DELAY_MS (150 ms) a jeho input stále drží focus – nový
        // popover ho musí převzít hned (ne až „na lichý hover")
        fireEvent.mouseLeave(taxonChip);
        const localityChip = screen.getByRole('button', {name: 'lokalita'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(localityChip);

        const localityInput = await screen.findByPlaceholderText('*pastvin* OR *les*');
        await waitFor(() => expect(localityInput).toHaveFocus());
        expect(taxonInput).not.toHaveFocus();
    });

    it('psaní do vstupu popoveru ho připíchne – odjetí myši nezavře', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps} visibleIds={['town']}/>));

        const chip = screen.getByRole('button', {name: 'obec'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const input = await screen.findByPlaceholderText('beneš*nad*');
        fireEvent.keyDown(input, {key: 'a'});
        fireEvent.mouseLeave(chip);

        // bez připnutí by popover zavřel CLOSE_DELAY_MS (150 ms) po odjetí myší
        await new Promise((resolve) => {
            setTimeout(resolve, 300);
        });
        expect(baseProps.onFiltersChanged).not.toHaveBeenCalled();
        expect(input).toBeInTheDocument();
    });

    it('Enter v textovém vstupu zavře popover chipu (spouštěč vyhledávání)', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps} visibleIds={['town']}/>));

        const chip = screen.getByRole('button', {name: 'obec'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const input = await screen.findByPlaceholderText('beneš*nad*');
        fireEvent.change(input, {target: {value: 'Šumava'}});
        fireEvent.keyDown(input, {key: 'Enter'});

        await waitFor(() => expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(1));
        expect(useAdvancedSearchStore.getState().values.town).toBe('Šumava');
    });

    it('výběr z typeahead spustí vyhledávání bez zavření popoveru', async () => {
        const herbariumOptions: TypeaheadOption[] = [{id: 1, label: 'BRNM'}];
        render(withQueryClient(
            <FilterChipRow
                {...baseProps}
                visibleIds={['herbarium']}
                optionsBySource={{...emptyOptions, herbariums: herbariumOptions}}
            />,
        ));

        const chip = screen.getByRole('button', {name: 'herbář'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const input = await screen.findByPlaceholderText('herbář');
        fireEvent.change(input, {target: {value: 'BRNM'}});
        fireEvent.click(screen.getByRole('option', {name: 'BRNM'}));

        expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(1);
        expect(useAdvancedSearchStore.getState().values.herbarium).toEqual(herbariumOptions);
        // výběr nezavírá popover – hodnotu lze ještě upravit
        expect(input).toBeInTheDocument();
    });

    it('výběr taxonu z autocomplete spustí vyhledávání', async () => {
        const provider: AutocompleteProvider<TaxonId> = {
            search: async () => [{id: 1, nameLat: 'Bryonia alba', nameHtml: ''}],
            label: (taxon) => taxon.nameLat,
            placeholder: 'taxon',
        };
        render(withQueryClient(<FilterChipRow {...baseProps} taxonProvider={provider}/>));

        const chip = screen.getByRole('button', {name: 'taxon'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const input = await screen.findByPlaceholderText('taxon');
        fireEvent.change(input, {target: {value: 'bry'}});

        const option = await screen.findByRole('option', {name: 'Bryonia alba'});
        fireEvent.click(option);

        expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(1);
        expect(useAdvancedSearchStore.getState().values.taxonName).toEqual([{id: 1, label: 'Bryonia alba'}]);
    });

    it('taxon filtr umožňuje vícenásobný výběr', async () => {
        const provider: AutocompleteProvider<TaxonId> = {
            search: async () => [
                {id: 1, nameLat: 'Bryonia alba', nameHtml: ''},
                {id: 2, nameLat: 'Carex pilulifera', nameHtml: ''},
            ],
            label: (taxon) => taxon.nameLat,
            placeholder: 'taxon',
        };
        render(withQueryClient(<FilterChipRow {...baseProps} taxonProvider={provider}/>));

        const chip = screen.getByRole('button', {name: 'taxon'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const input = await screen.findByPlaceholderText('taxon');
        fireEvent.change(input, {target: {value: 'bry'}});
        fireEvent.click(await screen.findByRole('option', {name: 'Bryonia alba'}));

        // multiple výběr: vstup se po výběru vyčistí, lze psát další taxon
        fireEvent.change(input, {target: {value: 'car'}});
        fireEvent.click(await screen.findByRole('option', {name: 'Carex pilulifera'}));

        expect(useAdvancedSearchStore.getState().values.taxonName).toEqual([
            {id: 1, label: 'Bryonia alba'},
            {id: 2, label: 'Carex pilulifera'},
        ]);
        expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('button', {name: 'taxon: Bryonia alba, Carex pilulifera'})).toBeInTheDocument();
    });

    it('pladiasId normalizuje vstup – libovolný nečíselný oddělovač na jediný středník', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps} visibleIds={['pladiasId']}/>));

        const chip = screen.getByRole('button', {name: 'Pladias ID'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const textarea = await screen.findByPlaceholderText('Pladias ID');
        // čárky, mezery, písmena i konce řádků → středník; sousední středníky
        // (i vzniklé normalizací) deduplikovány na jediný
        fireEvent.change(textarea, {target: {value: '123, abc 456;;78\n90;'}});

        expect(useAdvancedSearchStore.getState().values.pladiasId).toBe('123;456;78;90;');
        expect(screen.getByRole('button', {name: 'Pladias ID: 123;456;78;90;'})).toBeInTheDocument();
    });

    it('textové filtry bez idList se nenormalizují', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps} visibleIds={['town']}/>));

        const chip = screen.getByRole('button', {name: 'obec'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const input = await screen.findByPlaceholderText('beneš*nad*');
        fireEvent.change(input, {target: {value: 'abc, def 12'}});

        expect(useAdvancedSearchStore.getState().values.town).toBe('abc, def 12');
    });

    it('stav komenářů: dva checkboxy v jednom popoveru jednoho filtru', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps} visibleIds={['commentStatus']}/>));

        const chip = screen.getByRole('button', {name: 'stav komentáře'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        const commentedCheck = await screen.findByLabelText('jen s komentářem');
        const unresolvedCheck = screen.getByLabelText('jen s nevyřešeným komentářem');
        fireEvent.click(commentedCheck);
        fireEvent.click(unresolvedCheck);

        // každé přepnutí checkboxu spouští vyhledávání hned (onFiltersChanged),
        // popover zůstává otevřený
        expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(2);

        // pořadí vybraných voleb drží registr (commented, unresolvedComment)
        expect(useAdvancedSearchStore.getState().values.commentStatus).toEqual([
            {id: 'commented', label: 'jen s komentářem'},
            {id: 'unresolvedComment', label: 'jen s nevyřešeným komentářem'},
        ]);
        expect(screen.getByRole('button', {name: 'stav komentáře: jen s komentářem, jen s nevyřešeným komentářem'}))
            .toBeInTheDocument();

        // odškrtnutí obou vymaže hodnotu filtru ze store (prázdná skupina)
        fireEvent.click(commentedCheck);
        fireEvent.click(unresolvedCheck);

        expect(useAdvancedSearchStore.getState().values.commentStatus).toBeUndefined();
        expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(4);
    });

    it('filtr „je v polygonu" – nakreslení v popoveru uloží WKT a spustí vyhledávání', async () => {
        render(withQueryClient(<FilterChipRow {...baseProps} visibleIds={['polygon']}/>));

        const chip = screen.getByRole('button', {name: 'je v polygonu'}).closest('.filter-chip') as HTMLElement;
        fireEvent.mouseEnter(chip);

        // popover s mapou editoru polygonu
        expect(await screen.findByTestId('map-canvas')).toBeInTheDocument();

        act(() => {
            mapHandlers.current.click?.({latlng: {lat: 49.5, lng: 14.1}});
            mapHandlers.current.click?.({latlng: {lat: 49.6, lng: 14.2}});
            mapHandlers.current.click?.({latlng: {lat: 49.4, lng: 14.3}});
        });

        fireEvent.click(screen.getByRole('button', {name: 'Uzavřít polygon'}));

        // WKT uloženo ve store, uzavření commituje vyhledávání, chip nese značku
        expect(useAdvancedSearchStore.getState().values.polygon)
            .toBe('POLYGON ((14.100000 49.500000, 14.200000 49.600000, 14.300000 49.400000, 14.100000 49.500000))');
        expect(baseProps.onFiltersChanged).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', {name: 'je v polygonu: ✓'})).toBeInTheDocument();
    });

    it('„+" popover seskupuje filtry do sloupců podle kategorií a klik volá onToggleVisibility', () => {
        render(<FilterChipRow {...baseProps}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Filtr'}));

        // hlavičky čtyř kategorií
        expect(screen.getByText('Taxon')).toBeInTheDocument();
        expect(screen.getByText('Lokalita')).toBeInTheDocument();
        expect(screen.getByText('Původ dat')).toBeInTheDocument();
        expect(screen.getByText('Poznámky')).toBeInTheDocument();

        // prohlížeč posílá mousedown před click – popover nesmí zavřít dřív, než
        // doběhne onClick položky (regrese: klik dovnitř popoveru ho zavíral)
        fireEvent.mouseDown(screen.getByText('obec'));
        fireEvent.click(screen.getByText('obec'));

        expect(baseProps.onToggleVisibility).toHaveBeenCalledWith('town');
        // přepnutí filtru popover nezavírá (multi-toggle)
        expect(screen.getByText('obec')).toBeInTheDocument();
    });

    it('„+" popover lze zavřít opětovným kliknutím na tlačítko', async () => {
        render(<FilterChipRow {...baseProps}/>);

        fireEvent.click(screen.getByRole('button', {name: 'Filtr'}));
        expect(screen.getByText('obec')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Filtr'}));
        // odmontování popoveru proběhne asynchronně (NoopTransition onExited)
        await waitFor(() => expect(screen.queryByText('obec')).toBeNull());
    });
});

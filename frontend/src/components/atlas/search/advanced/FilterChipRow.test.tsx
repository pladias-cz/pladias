/**
 * Testy řádky chipů filtrů: defaultní chipy podle visibleIds, hodnota ze
 * store se zobrazí na chipu, křížek maže hodnotu, tlačítko Reset volá prop,
 * zavření popoveru chipu spouští onFiltersChanged (auto-vyhledávání) a „+"
 * dropdown seskupuje filtry do sloupců podle kategorií. Store je globální –
 * mezi testy se vrací na výchozí hodnoty.
 */

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
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

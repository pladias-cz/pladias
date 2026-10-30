import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {ComponentProps} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {RecordsByProject} from '@/models/AtlasRecords';
import type {InstanceConfigData} from '@/models/InstanceConfig';
import {InstanceConfigProvider} from '@/context/InstanceConfigContext';
import {InfoPanel} from './InfoPanel';
import {ALL_SOURCES_VISIBLE} from './recordSources';
import '@/i18n/i18n';

/**
 * Testy InfoPanelu po převodu na tabs: tři taby se jmény zdrojů a počty
 * záznamů, aktivní tab je řízený props activeSource/onSelectSource (mapa
 * přepíná tab při hoveru nad markerem cizího zdroje), checkboxy viditelnosti
 * na mapě v hlavičkách – klik na checkbox volá onToggleProjectVisibility
 * se správným zdrojem a nesmí přepnout aktivní tab (stopPropagation v
 * RecordSourceTab).
 * Taby omezuje konfigurace instance (externalRecordSources) – bez ní se
 * renderují všechny tři zdroje (kompatibilita se starším backendem).
 * Tabulky jsou mocknuté – testuje se jen chování tabs, ne obsah tabulek.
 */

vi.mock('./PladiasRecordsTable', () => ({
    PladiasRecordsTable: ({records}: { records: unknown[] }) => (
        <div data-testid={`pladias-table-${records.length}`}/>
    ),
}));

vi.mock('./ExternalRecordsTable', () => ({
    ExternalRecordsTable: ({records}: { records: unknown[] }) => (
        <div data-testid={`external-table-${records.length}`}/>
    ),
}));

/** Záznamy jen pro počty v hlavičkách – obsah tabulek je mocknutý. */
function makeRecords(pladiasCount: number, gbifCount: number, inaturalistCount: number): RecordsByProject {
    return {
        pladias: Array.from({length: pladiasCount}, (_, i) => ({id: i + 1})),
        gbif: Array.from({length: gbifCount}, (_, i) => ({id: 100 + i})),
        inaturalist: Array.from({length: inaturalistCount}, (_, i) => ({id: 200 + i})),
    } as unknown as RecordsByProject;
}

type InfoPanelProps = ComponentProps<typeof InfoPanel>;

function renderPanel(props: Partial<InfoPanelProps> = {}, config: InstanceConfigData = {}) {
    return render(
        <InstanceConfigProvider config={config}>
            <InfoPanel
                records={makeRecords(2, 1, 0)}
                visibleProjects={ALL_SOURCES_VISIBLE}
                onToggleProjectVisibility={vi.fn()}
                activeSource="pladias"
                onSelectSource={vi.fn()}
                {...props}
            />
        </InstanceConfigProvider>,
    );
}

afterEach(() => cleanup());

describe('InfoPanel', () => {
    it('vykreslí tři taby se jmény zdrojů a počty záznamů', () => {
        renderPanel();

        const pladiasTab = screen.getByRole('tab', {name: /PLADIAS/});
        const gbifTab = screen.getByRole('tab', {name: /GBIF/});
        const inaturalistTab = screen.getByRole('tab', {name: /iNaturalist/});
        expect(pladiasTab).toHaveTextContent('PLADIAS');
        expect(pladiasTab).toHaveTextContent('(2)');
        expect(gbifTab).toHaveTextContent('GBIF');
        expect(gbifTab).toHaveTextContent('(1)');
        expect(inaturalistTab).toHaveTextContent('iNaturalist');
        expect(inaturalistTab).toHaveTextContent('(0)');
    });

    it('defaultně je aktivní tab PLADIAS, ostatní taby nejsou aktivní', () => {
        renderPanel();

        expect(screen.getByRole('tab', {name: /PLADIAS/})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', {name: /GBIF/})).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByTestId('pladias-table-2').closest('.tab-pane')).toHaveClass('active');
        expect(screen.getByTestId('external-table-1').closest('.tab-pane')).not.toHaveClass('active');
    });

    it('klik na tab zavolá onSelectSource se zvoleným zdrojem', async () => {
        const user = userEvent.setup();
        const onSelectSource = vi.fn();
        renderPanel({onSelectSource});

        await user.click(screen.getByRole('tab', {name: /GBIF/}));
        expect(onSelectSource).toHaveBeenCalledWith('gbif');

        await user.click(screen.getByRole('tab', {name: /iNaturalist/}));
        expect(onSelectSource).toHaveBeenCalledWith('inaturalist');
    });

    it('aktivní tab řídí prop activeSource', () => {
        renderPanel({activeSource: 'inaturalist'});

        expect(screen.getByRole('tab', {name: /iNaturalist/})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByTestId('external-table-0').closest('.tab-pane')).toHaveClass('active');
        expect(screen.getByRole('tab', {name: /PLADIAS/})).toHaveAttribute('aria-selected', 'false');
    });

    it('klik na checkbox přepne viditelnost zdroje a nepřepne aktivní tab', async () => {
        const user = userEvent.setup();
        const onToggleProjectVisibility = vi.fn();
        renderPanel({onToggleProjectVisibility});

        const gbifTab = screen.getByRole('tab', {name: /GBIF/});
        const checkbox = within(gbifTab).getByRole('checkbox', {name: 'Zobrazit GBIF na mapě'});
        await user.click(checkbox);

        expect(onToggleProjectVisibility).toHaveBeenCalledTimes(1);
        expect(onToggleProjectVisibility).toHaveBeenCalledWith('gbif');
        // klik na checkbox nesmí přepnout aktivní tab (stopPropagation)
        expect(screen.getByRole('tab', {name: /PLADIAS/})).toHaveAttribute('aria-selected', 'true');
        expect(gbifTab).toHaveAttribute('aria-selected', 'false');
    });

    it('checkboxy odrážejí předanou viditelnost zdrojů', () => {
        renderPanel({visibleProjects: {pladias: true, gbif: false, inaturalist: true}});

        expect(within(screen.getByRole('tab', {name: /PLADIAS/})).getByRole('checkbox')).toBeChecked();
        expect(within(screen.getByRole('tab', {name: /GBIF/})).getByRole('checkbox')).not.toBeChecked();
        expect(within(screen.getByRole('tab', {name: /iNaturalist/})).getByRole('checkbox')).toBeChecked();
    });

    it('při načítání zobrazí spinner a ne taby', () => {
        renderPanel({recordsLoading: true});

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.queryByRole('tab')).toBeNull();
    });

    it('prázdný PLADIAS tab zobrazí hlášku o žádných záznamech', () => {
        renderPanel({records: makeRecords(0, 1, 1)});

        expect(screen.getByTestId('pladias-table-0')).toBeInTheDocument();
        expect(screen.getByText('Žádné záznamy')).toBeInTheDocument();
    });

    it('bez konfigurace instance vykreslí všechny tři taby (kompatibilita)', () => {
        renderPanel();

        expect(screen.getByRole('tab', {name: /PLADIAS/})).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: /GBIF/})).toBeInTheDocument();
        expect(screen.getByRole('tab', {name: /iNaturalist/})).toBeInTheDocument();
    });

    it('instance bez externích zdrojů zobrazí jen tab PLADIAS', () => {
        renderPanel({}, {externalRecordSources: []});

        expect(screen.getByRole('tab', {name: /PLADIAS/})).toBeInTheDocument();
        expect(screen.queryByRole('tab', {name: /GBIF/})).toBeNull();
        expect(screen.queryByRole('tab', {name: /iNaturalist/})).toBeNull();
    });

    it('částečná konfigurace zobrazí jen dostupné externí taby', () => {
        renderPanel({}, {externalRecordSources: ['inaturalist']});

        expect(screen.queryByRole('tab', {name: /GBIF/})).toBeNull();
        expect(screen.getByRole('tab', {name: /iNaturalist/})).toBeInTheDocument();
    });
});

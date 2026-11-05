/**
 * Testy dashboardu výsledků: bez uloženého výběru se zobrazí všechny widgety a
 * dotaz požádá o všechny agregace (form.aggregates); přepnutí widgetu skryje
 * kartu a zeptá se jen na zbylé; degradované stavy (vše vypnuto → info bez
 * dotazu, chyba → alert). recharts grafy se v jsdom nevykreslují (nulové
 * rozměry kontejneru), asserty jedou na titulky karet a strukturu.
 */

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ResultsDashboard} from './ResultsDashboard';
import {withQueryClient} from '@/test/withQueryClient';
import {searchAggregates, type DashboardAggregates} from '@/services/searchApi';
import {getUserSetting} from '@/services/settingsApi';
import '@/i18n/i18n';

vi.mock('@/services/searchApi', () => ({
    searchAggregates: vi.fn(),
}));

vi.mock('@/services/settingsApi', () => ({
    getUserSetting: vi.fn(),
}));

vi.mock('@/hooks/useUserSettings', () => ({
    useUserSettings: () => ({saveSetting: vi.fn()}),
}));

const aggregates: DashboardAggregates = {
    year: [{label: '2020', count: 3}],
    altitude: [{label: '200–399', count: 2}],
    license: [{label: 'cc0', count: 1}],
    herbarium: [{label: 'CB', count: 1}],
};

const payload = [['taxon_name', 'Carex']] as Array<[string, FormDataEntryValue]>;

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ResultsDashboard', () => {
    it('bez uloženého výběru zobrazí všechny widgety a požádá o všechny agregace', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);
        vi.mocked(searchAggregates).mockResolvedValue(aggregates);
        render(withQueryClient(<ResultsDashboard payloadEntries={payload}/>));

        expect(await screen.findByTestId('dashboard-widget-year')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-widget-altitude')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-widget-license')).toBeInTheDocument();
        expect(screen.getByTestId('dashboard-widget-herbarium')).toBeInTheDocument();
        // titulek karty (stejný text nese i přepínací tlačítko)
        expect(screen.getByTestId('dashboard-widget-year')).toHaveTextContent('Rok nálezu');

        await waitFor(() => expect(searchAggregates).toHaveBeenCalledTimes(1));
        const formData = vi.mocked(searchAggregates).mock.calls[0][0] as FormData;
        expect(formData.get('aggregates')).toBe('year,altitude,license,herbarium');
    });

    it('přepnutí widgetu skryje jeho kartu a zeptá se jen na zbylé agregace', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);
        vi.mocked(searchAggregates).mockResolvedValue(aggregates);
        render(withQueryClient(<ResultsDashboard payloadEntries={payload}/>));

        await screen.findByTestId('dashboard-widget-license');

        fireEvent.click(screen.getByRole('button', {name: 'Licence'}));

        // karta zmizela hned (aktivní widgety se počítají z výběru, ne z dat)
        await waitFor(() => {
            expect(screen.queryByTestId('dashboard-widget-license')).toBeNull();
        });
        // a dotaz nese už jen zbylé agregace
        await waitFor(() => {
            const calls = vi.mocked(searchAggregates).mock.calls;
            const formData = calls[calls.length - 1][0] as FormData;
            expect(formData.get('aggregates')).toBe('year,altitude,herbarium');
        });
    });

    it('s vypnutými všemi widgety zobrazí info a na nic se neptá', async () => {
        vi.mocked(getUserSetting).mockResolvedValue('[]');
        vi.mocked(searchAggregates).mockResolvedValue(aggregates);
        render(withQueryClient(<ResultsDashboard payloadEntries={payload}/>));

        expect(await screen.findByText('Není aktivní žádný přehled – zapněte ho tlačítky výše.')).toBeInTheDocument();
        expect(searchAggregates).not.toHaveBeenCalled();
        expect(screen.queryByTestId('dashboard-widget-year')).toBeNull();
    });

    it('chybu dotazu zobrazí alertem', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);
        vi.mocked(searchAggregates).mockRejectedValue(new Error('fail'));
        render(withQueryClient(<ResultsDashboard payloadEntries={payload}/>));

        expect(await screen.findByText('Načtení agregovaných výsledků se nezdařilo.')).toBeInTheDocument();
    });
});
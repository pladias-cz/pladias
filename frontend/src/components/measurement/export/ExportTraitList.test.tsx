import {cleanup, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ExportTraitList from './ExportTraitList';
import {getFeatureGroups, getFeaturesOfGroup, getTraitsOfFeature} from '@/services/traitApi';
import {useNotificationStore} from '@/stores/notificationStore';
import type {Feature} from '@/models/Feature';
import type {FeatureGroup} from '@/models/FeatureGroup';
import type {Trait} from '@/models/Trait';
import '@/i18n/i18n';

/**
 * Testy treeview výběru vlastností komplexního exportu: kaskádní zaškrtnutí
 * (skupina → vlastnost → řada), tri-state checkboxy a skryté vstupy
 * `traitIds[]` odesílané formulářem. Vitest bez globals: true nespouští
 * auto-cleanup, proto ručně.
 */

vi.mock('@/services/traitApi', () => ({
    getFeatureGroups: vi.fn(),
    getFeaturesOfGroup: vi.fn(),
    getTraitsOfFeature: vi.fn(),
}));

const getFeatureGroupsMock = vi.mocked(getFeatureGroups);
const getFeaturesOfGroupMock = vi.mocked(getFeaturesOfGroup);
const getTraitsOfFeatureMock = vi.mocked(getTraitsOfFeature);

function makeTrait(traitId: number): Trait {
    return {
        id: traitId,
        createTimestamp: '2020-06-15T12:00:00Z',
        totalTaxonCount: 1,
        sourceHtml: `zdroj ${traitId}`,
        descriptionCz: '',
        ownerHtml: '',
        visibilityDescriptionCz: '',
        hasAttachment: false,
        isDefault: false,
        canDownload: true,
        canDelete: false,
        canExport: true,
    };
}

function makeFeature(featureId: number, name: string, traitCount: number): Feature {
    return {
        id: featureId,
        name,
        administrator: '',
        email: '',
        explanation: '',
        bibliography: '',
        datatype: 1,
        inheritance: 1,
        section: '',
        traitCount,
    };
}

const groups: FeatureGroup[] = [
    {id: 1, name: 'Morfologie'},
    {id: 2, name: 'Ekologie'},
];

beforeEach(() => {
    getFeatureGroupsMock.mockResolvedValue(groups);
    getFeaturesOfGroupMock.mockImplementation(async groupId =>
        groupId === 1 ? [makeFeature(10, 'Výška', 2), makeFeature(11, 'Olistění', 1)]
            : [makeFeature(20, 'Habitar', 1), makeFeature(21, 'Vytrvalost', 0)]);
    getTraitsOfFeatureMock.mockImplementation(async featureId => {
        if (featureId === 10) return [makeTrait(100), makeTrait(101)];
        if (featureId === 11) return [makeTrait(110)];
        if (featureId === 21) return [];
        return [makeTrait(200)];
    });
});

afterEach(() => {
    cleanup();
    useNotificationStore.getState().clear();
    vi.clearAllMocks();
});

/** Hodnoty skrytých vstupů `traitIds[]` odesílaných formulářem. */
function hiddenTraitIds(): string[] {
    return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="traitIds[]"]'))
        .map(input => input.value);
}

describe('ExportTraitList', () => {
    it('načte skupiny a po rozbalení i vlastnosti a datové řady', async () => {
        render(<ExportTraitList/>);

        expect(await screen.findByRole('checkbox', {name: 'Morfologie'})).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: 'Ekologie'})).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', {name: 'Rozbalit Morfologie'}));
        expect(await screen.findByRole('checkbox', {name: 'Výška (2)'})).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', {name: 'Rozbalit Výška'}));
        expect(await screen.findByRole('checkbox', {name: /zdroj 100/})).toBeInTheDocument();
    });

    it('zobrazí počet datových řad u názvu vlastnosti', async () => {
        render(<ExportTraitList/>);

        await userEvent.click(await screen.findByRole('button', {name: 'Rozbalit Morfologie'}));
        expect(await screen.findByRole('checkbox', {name: 'Výška (2)'})).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: 'Olistění (1)'})).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', {name: 'Rozbalit Ekologie'}));
        expect(await screen.findByRole('checkbox', {name: 'Vytrvalost (0)'})).toBeInTheDocument();
    });

    it('zaškrtnutí skupiny dotaže a vybere všechny podřízené řady', async () => {
        render(<ExportTraitList/>);
        const groupCheckbox = await screen.findByRole<HTMLInputElement>('checkbox', {name: 'Morfologie'});

        await userEvent.click(groupCheckbox);

        await waitFor(() => expect(hiddenTraitIds()).toEqual(['100', '101', '110']));
        expect(groupCheckbox).toBeChecked();
        expect(groupCheckbox.indeterminate).toBe(false);
        expect(getFeaturesOfGroupMock).toHaveBeenCalledWith(1);
        expect(getTraitsOfFeatureMock).toHaveBeenCalledWith(10);
        expect(getTraitsOfFeatureMock).toHaveBeenCalledWith(11);
    });

    it('zrušení poslední vybrané řady zruší i nadřazenou položku', async () => {
        render(<ExportTraitList/>);
        const groupCheckbox = await screen.findByRole<HTMLInputElement>('checkbox', {name: 'Morfologie'});
        await userEvent.click(groupCheckbox);
        await waitFor(() => expect(hiddenTraitIds()).toEqual(['100', '101', '110']));

        await userEvent.click(screen.getByRole('button', {name: 'Rozbalit Morfologie'}));
        const featureCheckbox = await screen.findByRole<HTMLInputElement>('checkbox', {name: 'Výška (2)'});
        await userEvent.click(screen.getByRole('button', {name: 'Rozbalit Výška'}));

        // zrušení jedné řady → vlastnost i skupina částečně vybrané (indeterminate)
        await userEvent.click(screen.getByRole('checkbox', {name: /zdroj 100/}));
        expect(hiddenTraitIds()).toEqual(['101', '110']);
        expect(featureCheckbox.indeterminate).toBe(true);
        expect(groupCheckbox.indeterminate).toBe(true);

        // zrušení zbývajících řad ruší i nadřazené položky
        await userEvent.click(screen.getByRole('checkbox', {name: /zdroj 101/}));
        await userEvent.click(screen.getByRole('button', {name: 'Rozbalit Olistění'}));
        await userEvent.click(screen.getByRole('checkbox', {name: /zdroj 110/}));
        expect(hiddenTraitIds()).toEqual([]);
        expect(featureCheckbox).not.toBeChecked();
        expect(featureCheckbox.indeterminate).toBe(false);
        expect(groupCheckbox).not.toBeChecked();
        expect(groupCheckbox.indeterminate).toBe(false);
    });

    it('zaškrtnutí a zrušení vlastnosti vybere a zruší všechny její řady', async () => {
        render(<ExportTraitList/>);
        await userEvent.click(await screen.findByRole('button', {name: 'Rozbalit Morfologie'}));
        const featureCheckbox = await screen.findByRole<HTMLInputElement>('checkbox', {name: 'Výška (2)'});

        await userEvent.click(featureCheckbox);
        await waitFor(() => expect(hiddenTraitIds()).toEqual(['100', '101']));
        expect(featureCheckbox).toBeChecked();

        await userEvent.click(featureCheckbox);
        await waitFor(() => expect(hiddenTraitIds()).toEqual([]));
        expect(featureCheckbox).not.toBeChecked();
    });
});
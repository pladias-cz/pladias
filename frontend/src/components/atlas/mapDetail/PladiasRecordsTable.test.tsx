import {cleanup, render, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {RecordPladias} from '@/models';
import type {InstanceConfigData} from '@/models/InstanceConfig';
import {InstanceConfigProvider} from '@/context/InstanceConfigContext';
import {UserProvider} from '@/context/UserContext';
import {PladiasRecordsTable} from './PladiasRecordsTable';
import '@/i18n/i18n';

/**
 * Testy projektově podmíněných prvků tabulky záznamů (conf `atlas.excerptionProjectIds`
 * a `atlas.ndopProjectIds`): oddělovač "--" a checkbox herbářové revize jen u
 * excerpčních projektů, přímý NDOP odkaz jen u NDOP projektů. Bez direktiv v
 * konfiguraci instance (dalibor apod.) se nezobrazí nic z toho, i když ID sedí.
 */

vi.mock('./HerbariumQualityCheckbox', () => ({
    HerbariumQualityCheckbox: () => <div data-testid="herbarium-quality"/>,
}));

vi.mock('./AddCommentModal', () => ({
    AddCommentModal: () => null,
}));

/**
 * Minimální záznam – jen pole, ke kterým se collapsed řádek tabulky dostane.
 * Herbářová revize i NDOP odkaz se testují přes jednoznačný batchAuthorName,
 * protože projectName sdílí buňku s dalším textem (nedá se dohledat přes getByText).
 */
function makeRecord(id: number, projectId: number | null, batchAuthorName: string): RecordPladias {
    return {
        id,
        projectId,
        projectName: `Projekt ${projectId ?? 'bez'}`,
        originalId: '123',
        batchAuthorName,
        // ACCEPTED – u excerpčního projektu se herbářová revize zobrazuje
        validationStatusId: 3,
        herbariums: [{id: 1, name: 'CB', label: 'Herbář CB'}],
        canEditCommonFields: false,
        canEditValidationFields: false,
    } as unknown as RecordPladias;
}

function renderTable(records: RecordPladias[], configOverrides: Partial<InstanceConfigData> = {}) {
    return render(
        <UserProvider user={{id: 1}}>
            <InstanceConfigProvider config={{
                excerptionProjectIds: [14],
                ndopProjectIds: [9],
                ...configOverrides,
            }}>
                <PladiasRecordsTable records={records}/>
            </InstanceConfigProvider>
        </UserProvider>,
    );
}

/** Řádek tabulky dohledaný přes jednoznačného autora importu. */
function rowOf(batchAuthorName: string): HTMLElement {
    return screen.getByText(batchAuthorName).closest('tr') as HTMLElement;
}

afterEach(() => cleanup());

describe('PladiasRecordsTable – projektově podmíněné prvky', () => {
    it('excerpční projekt: oddělovač "--" a herbářová revize, bez NDOP odkazu', () => {
        renderTable([makeRecord(1, 14, 'Excerpční autor')]);

        const row = rowOf('Excerpční autor');
        expect(row).toHaveTextContent('--');
        expect(within(row).getByTestId('herbarium-quality')).toBeInTheDocument();
        expect(within(row).queryByText('přímý odkaz')).toBeNull();
    });

    it('NDOP projekt: přímý odkaz na kartu nálezu, bez oddělovače a herbářové revize', () => {
        renderTable([makeRecord(2, 9, 'NDOP autor')]);

        const row = rowOf('NDOP autor');
        const link = within(row).getByRole('link', {name: 'přímý odkaz'});
        expect(link).toHaveAttribute('href', 'http://portal.nature.cz/nd/find.php?akce=view&akce2=stopValidaci&karta_id=123');
        expect(row).not.toHaveTextContent('--');
        expect(within(row).queryByTestId('herbarium-quality')).toBeNull();
    });

    it('běžný projekt: bez oddělovače, herbářové revize i NDOP odkazu', () => {
        renderTable([makeRecord(3, 1, 'Ostatní autor')]);

        const row = rowOf('Ostatní autor');
        expect(row).not.toHaveTextContent('--');
        expect(within(row).queryByTestId('herbarium-quality')).toBeNull();
        expect(within(row).queryByText('přímý odkaz')).toBeNull();
    });

    it('bez direktiv v konfiguraci instance se nezobrazí žádný projektově podmíněný prvek', () => {
        renderTable([makeRecord(4, 14, 'Autor bez konfigurace')], {
            excerptionProjectIds: [],
            ndopProjectIds: [],
        });

        const row = rowOf('Autor bez konfigurace');
        expect(row).not.toHaveTextContent('--');
        expect(within(row).queryByTestId('herbarium-quality')).toBeNull();
        expect(within(row).queryByText('přímý odkaz')).toBeNull();
    });
});

import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
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
 * nearestTownName je jednoznačný dohledávací klíč řádku (sloupec Lokalita) –
 * na rozdíl od projectName/batchAuthorName se vykresluje pro každý typ projektu.
 */
function makeRecord(id: number, projectId: number | null, batchAuthorName: string): RecordPladias {
    return {
        id,
        projectId,
        projectName: `Projekt ${projectId ?? 'bez'}`,
        originalId: '123',
        batchAuthorName,
        // jednoznačná obec – přes ni se dohledává řádek tabulky (rowOf)
        nearestTownName: `Obec ${id}`,
        // ACCEPTED – u excerpčního projektu se herbářová revize zobrazuje
        validationStatusId: 3,
        herbariums: [{id: 1, name: 'CB', label: 'Herbář CB'}],
        canEditCommonFields: false,
        canEditValidationFields: false,
    } as unknown as RecordPladias;
}

function renderTable(
    records: RecordPladias[],
    configOverrides: Partial<InstanceConfigData> = {},
    props: Partial<Parameters<typeof PladiasRecordsTable>[0]> = {},
) {
    return render(
        <UserProvider user={{id: 1}}>
            <InstanceConfigProvider config={{
                excerptionProjectIds: [14],
                ndopProjectIds: [9],
                ...configOverrides,
            }}>
                <PladiasRecordsTable records={records} {...props}/>
            </InstanceConfigProvider>
        </UserProvider>,
    );
}

/** Řádek tabulky dohledaný přes jednoznačnou obec záznamu (sloupec Lokalita). */
function rowOf(nearestTownName: string): HTMLElement {
    return screen.getByText(nearestTownName).closest('tr') as HTMLElement;
}

afterEach(() => cleanup());

describe('PladiasRecordsTable – projektově podmíněné prvky', () => {
    it('excerpční projekt: oddělovač "--" a herbářová revize, bez NDOP odkazu', () => {
        renderTable([makeRecord(1, 14, 'Excerpční autor')]);

        const row = rowOf('Obec 1');
        expect(row).toHaveTextContent('--');
        expect(within(row).getByTestId('herbarium-quality')).toBeInTheDocument();
        expect(within(row).queryByText('přímý odkaz')).toBeNull();
    });

    it('NDOP projekt: přímý odkaz na kartu nálezu, bez oddělovače a herbářové revize', () => {
        renderTable([makeRecord(2, 9, 'NDOP autor')]);

        const row = rowOf('Obec 2');
        const link = within(row).getByRole('link', {name: 'přímý odkaz'});
        expect(link).toHaveAttribute('href', 'http://portal.nature.cz/nd/find.php?akce=view&akce2=stopValidaci&karta_id=123');
        expect(row).not.toHaveTextContent('--');
        expect(within(row).queryByTestId('herbarium-quality')).toBeNull();
    });

    it('běžný projekt: bez oddělovače, herbářové revize i NDOP odkazu', () => {
        renderTable([makeRecord(3, 1, 'Ostatní autor')]);

        const row = rowOf('Obec 3');
        expect(row).not.toHaveTextContent('--');
        expect(within(row).queryByTestId('herbarium-quality')).toBeNull();
        expect(within(row).queryByText('přímý odkaz')).toBeNull();
    });

    it('bez direktiv v konfiguraci instance se nezobrazí žádný projektově podmíněný prvek', () => {
        renderTable([makeRecord(4, 14, 'Autor bez konfigurace')], {
            excerptionProjectIds: [],
            ndopProjectIds: [],
        });

        const row = rowOf('Obec 4');
        expect(row).not.toHaveTextContent('--');
        expect(within(row).queryByTestId('herbarium-quality')).toBeNull();
        expect(within(row).queryByText('přímý odkaz')).toBeNull();
    });
});

describe('PladiasRecordsTable – sloupec Taxon a řazení hlaviček', () => {
    it('bez showTaxonName (mapDetail) se sloupec Taxon nevykreslí a hlavičky nejsou klikatelné', () => {
        renderTable([makeRecord(5, 1, 'Autor')]);

        expect(screen.queryByRole('columnheader', {name: 'Taxon'})).toBeNull();
        const header = screen.getByRole('columnheader', {name: 'Lokalita'});
        expect(header).not.toHaveClass('cursor-pointer');
    });

    it('showTaxonName: taxon má vlastní sloupec se jménem', () => {
        renderTable(
            [{...makeRecord(6, 1, 'Autor'), taxonNameHtml: '<i>Trifolium</i>'} as unknown as RecordPladias],
            {},
            {showTaxonName: true},
        );

        expect(screen.getByRole('columnheader', {name: 'Taxon'})).toBeInTheDocument();
        expect(screen.getByText('Trifolium')).toBeInTheDocument();
    });

    it('klik na řaditelnou hlavičku volá onHeaderSort se sort klíčem backendu', () => {
        const onHeaderSort = vi.fn();
        renderTable(
            [makeRecord(7, 1, 'Autor')],
            {},
            {
                showTaxonName: true,
                onHeaderSort,
                sort: {sortBy: 'taxonName', descending: false},
            },
        );

        // aktivní řazení dle taxonu vzestupně – hlavička nese indikátor
        const header = screen.getByRole('columnheader', {name: /Taxon/});
        expect(header).toHaveTextContent('🔼');
        fireEvent.click(header);
        expect(onHeaderSort).toHaveBeenCalledWith('taxonName');
    });

    it('klik na neřaditelnou hlavičku (Sběratelé) onHeaderSort nevolá', () => {
        const onHeaderSort = vi.fn();
        renderTable(
            [makeRecord(8, 1, 'Autor')],
            {},
            {showTaxonName: true, onHeaderSort},
        );

        fireEvent.click(screen.getByRole('columnheader', {name: 'Sběratelé'}));
        expect(onHeaderSort).not.toHaveBeenCalled();
    });
});

describe('PladiasRecordsTable – sloupec Fytochorion', () => {
    it('v buňce je jen kód fytochorionu, celý název nese tooltip', () => {
        renderTable(
            [{
                ...makeRecord(9, 1, 'Autor fytochorionu'),
                phytochorionPhytoId: '21',
                phytochorionName: 'Předhoří Českomoravské',
            } as unknown as RecordPladias],
            {isVascular: true},
        );

        const cell = screen.getByText('21').closest('td') as HTMLElement;
        expect(cell).toHaveAttribute('title', 'Předhoří Českomoravské');
        // název fytochorionu už není přímo v buňce
        expect(cell).toHaveTextContent('21');
        expect(cell).not.toHaveTextContent('Předhoří Českomoravské');
    });

    it('bez fytochorionu se v buňce vypíše pomlčka', () => {
        renderTable(
            [{...makeRecord(10, 1, 'Autor bez fytochorionu')} as unknown as RecordPladias],
            {isVascular: true},
        );

        const row = rowOf('Obec 10') as HTMLTableRowElement;
        const headerIndex = (screen.getByRole('columnheader', {name: /Fyt\./}) as HTMLTableCellElement)
            .cellIndex;
        const cell = row.cells[headerIndex];
        expect(cell).toHaveTextContent('-');
        expect(cell).toHaveAttribute('title', '');
    });
});

describe('PladiasRecordsTable – sloupec Kvadrant', () => {
    /** Buňka sloupce Kv. dohledaná přes index hlavičky v daném řádku. */
    function quadrantCell(row: HTMLTableRowElement): HTMLElement {
        const header = screen.getByRole('columnheader', {name: 'Kv.'}) as HTMLTableCellElement;
        return row.cells[header.cellIndex];
    }

    it('defaultně (mapDetail) jen písmeno kvadrantu, celý kód nese tooltip', () => {
        renderTable(
            [{...makeRecord(11, 1, 'Autor kvadrantu'), computedQuadrantCode: '6261b'} as unknown as RecordPladias],
        );

        const row = rowOf('Obec 11') as HTMLTableRowElement;
        const cell = quadrantCell(row);
        expect(cell).toHaveTextContent('b');
        expect(cell).not.toHaveTextContent('6261b');
        expect(cell).toHaveAttribute('title', '6261b');
    });

    it('se showFullQuadrantCode (vyhledávání) se v buňce vypíše plný kód', () => {
        renderTable(
            [{...makeRecord(12, 1, 'Autor plného kódu'), computedQuadrantCode: '6261b'} as unknown as RecordPladias],
            {},
            {showFullQuadrantCode: true},
        );

        const row = rowOf('Obec 12') as HTMLTableRowElement;
        const cell = quadrantCell(row);
        expect(cell).toHaveTextContent('6261b');
        expect(cell).toHaveAttribute('title', '6261b');
    });

    it('bez kvadrantu se v buňce vypíše pomlčka', () => {
        renderTable([{...makeRecord(13, 1, 'Autor bez kvadrantu')} as unknown as RecordPladias]);

        const row = rowOf('Obec 13') as HTMLTableRowElement;
        expect(quadrantCell(row)).toHaveTextContent('-');
    });
});

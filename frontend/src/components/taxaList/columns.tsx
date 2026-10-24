/**
 * Sdílená column factory pro obě varianty TaxaList (improvements 2.4):
 * read-only „moje taxony“ (atlas) i editační tabulku (atlasAdmin).
 *
 * Bez `editableCells` vrací read-only sloupce (bez řazení, textové vykreslení
 * hodnot). Předáním objektu s injektovanými renderery vznikne editovatelná
 * varianta – interaktivní buňky (MappedCell, StatusSelect, PresliaInlineField,
 * číselný input, checkbox, ArchiveCsvCell) zůstávají vnitřností admin feature,
 * sdílený modul je jen skládá (žádné cross-feature importy).
 */
import type {ReactNode} from 'react';
import type {TFunction} from 'i18next';
import {
    createActionColumn,
    createBooleanColumn,
    createCheckboxColumn,
    createNumberColumn,
    createTextColumn,
    type DataTableColumnDef,
} from '@/core/dataTable';
import type {TaxonMapSettings} from '@/models/TaxonMapSettings';
import type {TaxonStatusOption} from '@/services/mapAdminApi';

/** Editovatelné buňky – injektuje je volající z atlasAdmin feature. */
export interface EditableTaxaCells {
    /** odkaz na editační mapu taxonu (místo read-only odkazu do atlasu) */
    renderTaxonLink: (row: TaxonMapSettings) => ReactNode;
    /** MappedCell – přepínač mapování + autocomplete nadřazené mapy */
    renderIsMapped: (row: TaxonMapSettings) => ReactNode;
    /** číselný input prahu běžnosti */
    renderCommonThreshold: (row: TaxonMapSettings) => ReactNode;
    /** přepínání ochrany taxonu (checkbox sloupec) */
    onIsProtectedToggle: (row: TaxonMapSettings) => Promise<void>;
    isProtectedDisabled: (row: TaxonMapSettings) => boolean;
    /** Preslia – inline editace */
    renderPreslia: (row: TaxonMapSettings) => ReactNode;
    /** status selecty (revize/publikace) */
    renderRevisionStatus: (row: TaxonMapSettings) => ReactNode;
    renderPublicationStatus: (row: TaxonMapSettings) => ReactNode;
    /** archive CSV + PNG upload */
    renderArchiveCsv: (row: TaxonMapSettings) => ReactNode;
}

export interface CreateTaxaColumnsOptions {
    t: TFunction;
    /** číselník revizních stavů (mapAdminApi.getRevisionStatuses) */
    revisionStatusOptions: TaxonStatusOption[];
    /** číselník publikačních stavů (mapAdminApi.getPublicationStatuses) */
    publicationStatusOptions: TaxonStatusOption[];
    /** bez něj vznikne read-only varianta pro atlas */
    editableCells?: EditableTaxaCells;
}

/** Filtr statusu – „Popis [id]“; filtruje se podle id backendového pole. */
const statusFilterOptions = (options: TaxonStatusOption[]) =>
    options.map(o => ({value: String(o.id), label: `${o.description} [${o.id}]`}));

/** Read-only buňka statusu – „Popis[id]“, nevyplněno '-'. */
const statusCell = (description: string | undefined | null, id: number) => {
    const desc = description || '-';
    return desc !== '-' ? `${desc}[${id}]` : desc;
};

export function createTaxaColumns(
    {t, revisionStatusOptions, publicationStatusOptions, editableCells}: CreateTaxaColumnsOptions,
): DataTableColumnDef<TaxonMapSettings>[] {
    // read-only varianta (atlas) – jen zobrazení, řazení vypnuté
    if (!editableCells) {
        return [
            createTextColumn<TaxonMapSettings>('taxonNameLat', t('atlas.admin.taxaList.latinName'), {
                enableSorting: false,
                enableFiltering: true,
                filterPlaceholder: t('atlas.admin.taxaList.filterLatinName'),
                cellRenderer: (_value, row) => (
                    <>
                        <i>
                            <a href={`/atlas/map?taxonId=${row.taxonId}`}>
                                <i>{row.taxonNameLat}</i>
                            </a>
                        </i>
                        {row.taxonRankCz && (
                            <small className="text-muted"> ({row.taxonRankCz})</small>
                        )}
                    </>
                ),
            }),
            createBooleanColumn<TaxonMapSettings>('isMapped', t('atlas.admin.taxaList.mapped'), {
                enableSorting: false,
                enableFiltering: true,
                trueLabel: t('common.yes'),
                falseLabel: t('common.no'),
            }),
            createTextColumn<TaxonMapSettings>('commonThreshold', t('atlas.admin.taxaList.commonThreshold'), {
                enableSorting: false,
                enableFiltering: true,
                cellRenderer: (value) => value?.toString() ?? '-',
            }),
            createBooleanColumn<TaxonMapSettings>('isProtected', t('atlas.admin.taxaList.protected'), {
                enableSorting: false,
                enableFiltering: false,
                trueLabel: t('common.yes'),
                falseLabel: t('common.no'),
            }),
            createTextColumn<TaxonMapSettings>('revisors', t('atlas.admin.taxaList.revisors'), {
                enableSorting: false,
                enableFiltering: false,
                filterPlaceholder: t('atlas.admin.taxaList.filterRevisors'),
                cellRenderer: (value) => value || '-',
            }),
            // filtruje se podle id backendového pole, zobrazuje se „Popis[id]“
            createTextColumn<TaxonMapSettings>('revisionStatusId', t('atlas.admin.taxaList.revisionStatus'), {
                enableSorting: false,
                enableFiltering: true,
                filterOptions: statusFilterOptions(revisionStatusOptions),
                cellRenderer: (_value, row) => statusCell(row.revisionStatusDescription, row.revisionStatusId),
            }),
            createTextColumn<TaxonMapSettings>('publicationStatusId', t('atlas.admin.taxaList.publicationStatus'), {
                enableSorting: false,
                enableFiltering: true,
                filterOptions: statusFilterOptions(publicationStatusOptions),
                cellRenderer: (_value, row) => statusCell(row.publicationStatusDescription, row.publicationStatusId),
            }),
        ];
    }

    // editovatelná varianta (atlasAdmin) – interaktivní buňky injektované výš
    const cells = editableCells;
    return [
        // latinské jméno + rank – editovatelná varianta odkazuje na mapMain
        createTextColumn<TaxonMapSettings>('taxonNameLat', t('atlas.admin.taxaList.latinName'), {
            enableSorting: true,
            enableFiltering: true,
            filterPlaceholder: t('atlas.admin.taxaList.filterLatinName'),
            cellRenderer: (_value, row) => (
                <>
                    <i>{cells.renderTaxonLink(row)}</i>
                    {row.taxonRankCz && (
                        <small className="text-muted"> ({row.taxonRankCz})</small>
                    )}
                </>
            ),
        }),
        // mapování – MappedCell (checkbox + autocomplete nadřazené mapy)
        createActionColumn<TaxonMapSettings>('isMapped', t('atlas.admin.taxaList.mapped'), cells.renderIsMapped, {
            minWidth: '250px',
        }),
        // práh běžnosti – číselný input
        createNumberColumn<TaxonMapSettings>('commonThreshold', t('atlas.admin.taxaList.commonThreshold'), {
            enableSorting: true,
            enableFiltering: true,
            cellRenderer: (_value, row) => cells.renderCommonThreshold(row),
        }),
        // ochrana – checkbox
        createCheckboxColumn<TaxonMapSettings>('isProtected', t('atlas.admin.taxaList.protected'), async (row) => {
            await cells.onIsProtectedToggle(row);
        }, {
            enableSorting: true,
            enableFiltering: true,
            isDisabled: cells.isProtectedDisabled,
        }),
        createTextColumn<TaxonMapSettings>('preslia', t('atlas.admin.taxaList.preslia'), {
            enableSorting: true,
            enableFiltering: true,
            filterPlaceholder: t('atlas.admin.taxaList.filterPreslia'),
            cellRenderer: (_value, row) => cells.renderPreslia(row),
        }),
        createTextColumn<TaxonMapSettings>('revisors', t('atlas.admin.taxaList.revisors'), {
            enableSorting: true,
            enableFiltering: false,
            filterPlaceholder: t('atlas.admin.taxaList.filterRevisors'),
            cellRenderer: (value) => value || '-',
        }),
        // statusy – StatusSelect; filtruje se podle id backendového pole
        createTextColumn<TaxonMapSettings>('revisionStatusId', t('atlas.admin.taxaList.revisionStatus'), {
            enableSorting: true,
            enableFiltering: true,
            filterOptions: statusFilterOptions(revisionStatusOptions),
            cellRenderer: (_value, row) => cells.renderRevisionStatus(row),
        }),
        createTextColumn<TaxonMapSettings>('publicationStatusId', t('atlas.admin.taxaList.publicationStatus'), {
            enableSorting: true,
            enableFiltering: true,
            filterOptions: statusFilterOptions(publicationStatusOptions),
            cellRenderer: (_value, row) => cells.renderPublicationStatus(row),
        }),
        // archive CSV + PNG upload
        createActionColumn<TaxonMapSettings>('archiveCSV', t('atlas.admin.taxaList.archiveCSV'), cells.renderArchiveCsv, {
            minWidth: '200px',
        }),
    ];
}

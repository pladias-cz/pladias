/**
 * TaxaList - Taxon Map Settings Administration Component
 *
 * Uses the enterprise DataTable component with custom data fetching
 * to efficiently load taxa and their map settings.
 */

import {useState, useCallback, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {
    DataTable,
    type DataTableColumnDef,
    type TableDataUpdater,
    createActionColumn,
    createCheckboxColumn,
    createTextColumn,
    createNumberColumn
} from '@/core/dataTable';
import {
    useTaxaData,
    useTaxonUpdates,
    extractTaxaFilters,
} from './taxaList/hooks';
import {
    StatusSelect,
    PresliaInlineField,
    ArchiveCsvCell,
    MappedCell,
} from './taxaList/components';
import type {TaxonMapSettings, TaxonOption} from './taxaList/types';
import {getPublicationStatuses, getRevisionStatuses} from '@/services/mapAdminApi';
import {notifyApiError} from '@/stores/notificationStore';
import {useCatalogQuery} from '@/query/useCatalogQuery';
import {Link} from "react-router-dom";

export default function TaxaList() {
    const {t} = useTranslation();

    // Optimistický updater řádků tabulky – zaregistruje ho DataTable po mountu
    // (onDataUpdater); vlastní cellRenderery (status selecty, mapování, Preslia,
    // PNG…) s ním projeví změny okamžitě bez refetche (vrstva žije do nejbližší
    // odpovědi serveru).
    //
    // Pozor: updater se drží v refu, NE ve state. React považuje funkční
    // argument setState za funkční updater – `setState(setData)` by zavolal
    // `setData(null)` a uložil jeho návratovou hodnotu (undefined) místo
    // funkce samotné; registrace by se tiše ztratila a optimistická vrstva
    // by nikdy nefungovala (viz docs/gotchas.md).
    const localDataUpdaterRef = useRef<TableDataUpdater<TaxonMapSettings> | null>(null);

    const handleDataUpdater = useCallback((updater: TableDataUpdater<TaxonMapSettings> | null) => {
        localDataUpdaterRef.current = updater;
    }, []);

    // Vynucení refetche dat tabulky po mutacích mimo DataTable (uložení
    // Preslia apod.) – viz refreshKey v DataTable.
    const [tableRefreshKey, setTableRefreshKey] = useState(0);

    // číselníky statusů – bez cache (sekce J); při selhání zůstane filtr
    // prázdný (stejně jako dřív – chybu jen logoval)
    const revisionStatusOptions = useCatalogQuery(["revisionStatuses"], getRevisionStatuses);
    const publicationStatusOptions = useCatalogQuery(["publicationStatuses"], getPublicationStatuses);

    const {fetchTaxa} = useTaxaData({
        onSuccess: () => {
            // Optional: handle successful data fetch
        }
    });

    const {
        updatingTaxonId,
        updateIsMapped,
        updateParentMap,
        updateCommonThreshold,
        updateIsProtected,
        updatePreslia,
        updateRevisionStatus,
        updatePublicationStatus,
    } = useTaxonUpdates();

    // Chyby mutací reportuje globální notifikační store (toast): hláška
    // backendu (concurrency, neplatný přechod statusu…) z ApiError.payload,
    // lokalizovaný fallback jinak; chyby už centrálně oznámené (403, síť)
    // notifyApiError přeskakuje.
    const handleError = useCallback((error: unknown) => {
        notifyApiError(error, t("atlas.admin.taxaList.updateFailed"));
    }, [t]);

    const refreshTable = useCallback(() => {
        setTableRefreshKey(key => key + 1);
    }, []);

    const updateLocalData = useCallback((updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => {
        localDataUpdaterRef.current?.(updater);
    }, []);

    const handlePngUploadComplete = useCallback((taxonId: number, hasPng: boolean) => {
        updateLocalData(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {...t, hasPng} : t
            )
        );
    }, [updateLocalData]);

    const handleIsMappedChange = useCallback(async (row: TaxonMapSettings) => {
        await updateIsMapped(row, updateLocalData, handleError);
    }, [updateIsMapped, updateLocalData, handleError]);

    const handleParentMapChange = useCallback(async (row: TaxonMapSettings, selected: TaxonOption | null) => {
        await updateParentMap(
            row,
            selected ? selected.id : null,
            selected ? selected.nameLat : null,
            updateLocalData,
            handleError
        );
    }, [updateParentMap, updateLocalData, handleError]);

    const handleCommonThresholdChange = useCallback(async (row: TaxonMapSettings, newValue: number) => {
        await updateCommonThreshold(row, newValue, updateLocalData, handleError);
    }, [updateCommonThreshold, updateLocalData, handleError]);

    const handleIsProtectedChange = useCallback(async (row: TaxonMapSettings) => {
        try {
            await updateIsProtected(row, updateLocalData, handleError);
        } finally {
            // jako u Preslia: refetch po úspěchu (nová hodnota + čerstvý
            // lastEditTimestamp, další editace téhož řádku nespadne na
            // concurrency kontrole) i selhání (resynchronizace řádku s DB –
            // optimisticky přepnutý checkbox se vrátí na pravdu serveru)
            refreshTable();
        }
    }, [updateIsProtected, updateLocalData, handleError, refreshTable]);

    const handlePresliaChange = useCallback(async (row: TaxonMapSettings, newValue: string) => {
        try {
            await updatePreslia(row, newValue, updateLocalData, handleError);
        } finally {
            // Refetch po úspěchu i selhání: po úspěchu se v tabulce projeví nová
            // hodnota i čerstvý lastEditTimestamp (další editace téhož řádku
            // nespadne na concurrency kontrole); po selhání se řádek
            // resynchronizuje s DB a další pokus použije platný timestamp.
            refreshTable();
        }
    }, [updatePreslia, updateLocalData, handleError, refreshTable]);

    const handleRevisionStatusChange = useCallback(async (row: TaxonMapSettings, newValue: number) => {
        await updateRevisionStatus(row, newValue, updateLocalData, handleError);
    }, [updateRevisionStatus, updateLocalData, handleError]);

    const handlePublicationStatusChange = useCallback(async (row: TaxonMapSettings, newValue: number) => {
        await updatePublicationStatus(row, newValue, updateLocalData, handleError);
    }, [updatePublicationStatus, updateLocalData, handleError]);

    const columns = useMemo<DataTableColumnDef<TaxonMapSettings>[]>(() => [
        createTextColumn<TaxonMapSettings>('taxonNameLat', t("atlas.admin.taxaList.latinName"), {
            enableSorting: true,
            enableFiltering: true,
            filterPlaceholder: t("atlas.admin.taxaList.filterLatinName"),
            cellRenderer: (_value, row) => (
                <>
                    <i>
                        <Link to={`/atlas/mapMain/${row.taxonId}`} target="_blank"
                              rel="noopener noreferrer">{row.taxonNameLat}</Link>
                    </i>
                    {row.taxonRankCz && (
                        <small className="text-muted"> ({row.taxonRankCz})</small>
                    )}
                </>
            ),
        }),
        createActionColumn<TaxonMapSettings>('isMapped', t("atlas.admin.taxaList.mapped"), (row) => (
            <MappedCell
                row={row}
                updatingTaxonId={updatingTaxonId}
                onIsMappedChange={handleIsMappedChange}
                onParentMapChange={handleParentMapChange}
            />
        ), {
            minWidth: '250px',
        }),
        createNumberColumn<TaxonMapSettings>('commonThreshold', t("atlas.admin.taxaList.commonThreshold"), {
            enableSorting: true,
            enableFiltering: true,
            cellRenderer: (_value, row) => (
                <input
                    type="number"
                    min={0}
                    max={3}
                    value={row.commonThreshold}
                    onChange={(e) => handleCommonThresholdChange(row, parseInt(e.target.value) || 0)}
                    disabled={updatingTaxonId === row.taxonId}
                    className="form-control form-control-sm"
                    style={{width: '60px'}}
                />
            ),
        }),
        createCheckboxColumn<TaxonMapSettings>('isProtected', t("atlas.admin.taxaList.protected"), async (_row, _checked) => {
            await handleIsProtectedChange(_row);
        }, {
            enableSorting: true,
            enableFiltering: true,
            isDisabled: (row) => updatingTaxonId === row.taxonId,
        }),
        createTextColumn<TaxonMapSettings>('preslia', t("atlas.admin.taxaList.preslia"), {
            enableSorting: true,
            enableFiltering: true,
            filterPlaceholder: t("atlas.admin.taxaList.filterPreslia"),
            cellRenderer: (_value, row) => (
                <PresliaInlineField
                    taxonId={row.taxonId}
                    value={row.preslia}
                    onSave={(newValue) => handlePresliaChange(row, newValue)}
                    disabled={updatingTaxonId === row.taxonId}
                />
            ),
        }),
        createTextColumn<TaxonMapSettings>('revisors', t("atlas.admin.taxaList.revisors"), {
            enableSorting: true,
            enableFiltering: false,
            filterPlaceholder: t("atlas.admin.taxaList.filterRevisors"),
            cellRenderer: (value) => value || '-',
        }),
        createTextColumn<TaxonMapSettings>('revisionStatusId', t("atlas.admin.taxaList.revisionStatus"), {
            enableSorting: true,
            enableFiltering: true,
            filterOptions: revisionStatusOptions.map(o => ({value: String(o.id), label: `${o.description} [${o.id}]`})),
            cellRenderer: (_value, row) => (
                <StatusSelect
                    value={row.revisionStatusId}
                    options={revisionStatusOptions}
                    onChange={(newValue) => handleRevisionStatusChange(row, newValue)}
                    disabled={updatingTaxonId === row.taxonId}
                />
            ),
        }),
        createTextColumn<TaxonMapSettings>('publicationStatusId', t("atlas.admin.taxaList.publicationStatus"), {
            enableSorting: true,
            enableFiltering: true,
            filterOptions: publicationStatusOptions.map(o => ({
                value: String(o.id),
                label: `${o.description} [${o.id}]`
            })),
            cellRenderer: (_value, row) => (
                <StatusSelect
                    value={row.publicationStatusId}
                    options={publicationStatusOptions}
                    onChange={(newValue) => handlePublicationStatusChange(row, newValue)}
                    disabled={updatingTaxonId === row.taxonId}
                />
            ),
        }),
        createActionColumn<TaxonMapSettings>('archiveCSV', t("atlas.admin.taxaList.archiveCSV"), (row) => (
            <ArchiveCsvCell
                row={row}
                onPngUploadComplete={handlePngUploadComplete}
            />
        ), {
            minWidth: '200px',
        }),
    ], [
        t,
        revisionStatusOptions,
        publicationStatusOptions,
        updatingTaxonId,
        handleIsMappedChange,
        handleParentMapChange,
        handleCommonThresholdChange,
        handleIsProtectedChange,
        handlePresliaChange,
        handleRevisionStatusChange,
        handlePublicationStatusChange,
        handlePngUploadComplete,
    ]);

    return (
        <div className="container-fluid">
            <DataTable<TaxonMapSettings>
                endpoint="/api/react/atlasadmin/taxa"
                columns={columns}
                fetchData={fetchTaxa}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                hasExcelExport
                buildExportFilterParams={extractTaxaFilters}
                refreshKey={tableRefreshKey}
                onDataUpdater={handleDataUpdater}
            />
        </div>
    );
}

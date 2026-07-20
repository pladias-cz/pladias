/**
 * TaxaList - Taxon Map Settings Administration Component
 * 
 * Uses the enterprise DataTable component with custom data fetching
 * to efficiently load taxa and their map settings.
 */

import {useState, useCallback, useMemo, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {DataTable, type DataTableColumnDef, createActionColumn, createCheckboxColumn, createTextColumn, createNumberColumn} from '@/core/dataTable';
import {
    useTaxaData,
    useTaxonUpdates,
} from './taxaList/hooks';
import {
    StatusSelect,
    PresliaInlineField,
    ArchiveCsvCell,
    MappedCell,
} from './taxaList/components';
import type {TaxonMapSettings, StatusOption, TaxonOption} from './taxaList/types';

export default function TaxaList() {
    const {t} = useTranslation();
    
    const [error, setError] = useState<string | null>(null);
    const [revisionStatusOptions, setRevisionStatusOptions] = useState<StatusOption[]>([]);
    const [publicationStatusOptions, setPublicationStatusOptions] = useState<StatusOption[]>([]);
    const [localDataUpdater, _setLocalDataUpdater] = useState<((updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => void) | null>(null);

    useEffect(() => {
        const fetchStatusOptions = async () => {
            try {
                const [revisionRes, publicationRes] = await Promise.all([
                    fetch('/api/react/atlasadmin/revision-statuses'),
                    fetch('/api/react/atlasadmin/publication-statuses')
                ]);

                const revisionData = await revisionRes.json();
                const publicationData = await publicationRes.json();

                if (revisionData.success) {
                    setRevisionStatusOptions(revisionData.data || []);
                }
                if (publicationData.success) {
                    setPublicationStatusOptions(publicationData.data || []);
                }
            } catch (error) {
                console.error('Error fetching status options:', error);
            }
        };

        fetchStatusOptions();
    }, []);

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

    const showError = useCallback((message: string) => {
        setError(message);
        setTimeout(() => setError(null), 5000);
    }, []);

    const updateLocalData = useCallback((updater: (prev: TaxonMapSettings[]) => TaxonMapSettings[]) => {
        if (localDataUpdater) {
            localDataUpdater(updater);
        }
    }, [localDataUpdater]);

    const handlePngUploadComplete = useCallback((taxonId: number, hasPng: boolean) => {
        updateLocalData(prev =>
            prev.map(t =>
                t.taxonId === taxonId ? {...t, hasPng} : t
            )
        );
    }, [updateLocalData]);

    const handleIsMappedChange = useCallback(async (row: TaxonMapSettings) => {
        await updateIsMapped(row, updateLocalData, showError);
    }, [updateIsMapped, updateLocalData, showError]);

    const handleParentMapChange = useCallback(async (row: TaxonMapSettings, selected: TaxonOption | null) => {
        await updateParentMap(
            row,
            selected ? selected.id : null,
            selected ? selected.nameLat : null,
            updateLocalData,
            showError
        );
    }, [updateParentMap, updateLocalData, showError]);

    const handleCommonThresholdChange = useCallback(async (row: TaxonMapSettings, newValue: number) => {
        await updateCommonThreshold(row, newValue, updateLocalData, showError);
    }, [updateCommonThreshold, updateLocalData, showError]);

    const handleIsProtectedChange = useCallback(async (row: TaxonMapSettings) => {
        await updateIsProtected(row, updateLocalData, showError);
    }, [updateIsProtected, updateLocalData, showError]);

    const handlePresliaChange = useCallback(async (row: TaxonMapSettings, newValue: string) => {
        await updatePreslia(row, newValue, updateLocalData, showError);
    }, [updatePreslia, updateLocalData, showError]);

    const handleRevisionStatusChange = useCallback(async (row: TaxonMapSettings, newValue: number) => {
        await updateRevisionStatus(row, newValue, updateLocalData, showError);
    }, [updateRevisionStatus, updateLocalData, showError]);

    const handlePublicationStatusChange = useCallback(async (row: TaxonMapSettings, newValue: number) => {
        await updatePublicationStatus(row, newValue, updateLocalData, showError);
    }, [updatePublicationStatus, updateLocalData, showError]);

    const columns = useMemo<DataTableColumnDef<TaxonMapSettings>[]>(() => [
        createTextColumn<TaxonMapSettings>('taxonNameLat', t("atlas.admin.taxaList.latinName"), {
            enableSorting: true,
            enableFiltering: true,
            filterPlaceholder: t("atlas.admin.taxaList.filterLatinName"),
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
            enableFiltering: true,
            filterPlaceholder: t("atlas.admin.taxaList.filterRevisors"),
            cellRenderer: (value) => value || '-',
        }),
        createTextColumn<TaxonMapSettings>('revisionStatusId', t("atlas.admin.taxaList.revisionStatus"), {
            enableSorting: true,
            enableFiltering: true,
            filterPlaceholder: t("atlas.admin.taxaList.filterRevisionStatus"),
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
            filterPlaceholder: t("atlas.admin.taxaList.filterPublicationStatus"),
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
            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError(null)}></button>
                </div>
            )}
            
            <DataTable<TaxonMapSettings>
                endpoint="/api/react/atlasadmin/taxa"
                columns={columns}
                fetchData={fetchTaxa}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
        </div>
    );
}

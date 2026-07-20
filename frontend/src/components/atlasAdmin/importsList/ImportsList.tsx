/**
 * ImportsList - Import Administration Component
 * 
 * Uses the enterprise DataTable component with custom data fetching
 * to efficiently load imports with pagination, sorting, and filtering.
 */

import {useState, useMemo, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {
    DataTable,
    type DataTableColumnDef,
    createTextColumn,
    createTimestampColumn,
    createActionColumn,
} from "@/core/dataTable";
import {
    useImportsData,
    useImportsActions,
} from './hooks';
import {
    ImportsListFlash,
    ImportsListDataCell,
    ImportsListFilenameCell,
    ImportsListDownloadCell,
    ImportsListDeleteCell,
} from './components';
import type {ImportRecord, FlashMessage} from './types';

export default function ImportsList() {
    const {t} = useTranslation();
    
    // Flash message state
    const [flash, setFlash] = useState<FlashMessage | null>(null);
    
    // Flash message handler
    const showFlash = useCallback((type: 'success' | 'danger', message: string) => {
        setFlash({type, message});
        setTimeout(() => setFlash(null), 5000);
    }, []);
    
    // Data fetching hook
    const {fetchImports} = useImportsData({
        onSuccess: () => {
            // Optional: handle successful data fetch
        }
    });
    
    // Actions hook
    const {
        deletingBatchId,
        handleDelete,
    } = useImportsActions(showFlash, t);
    
    // Column definitions
    const columns = useMemo<DataTableColumnDef<ImportRecord>[]>(() => [
        createTextColumn<ImportRecord>('committerName', t("atlas.admin.importsList.committer"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTimestampColumn<ImportRecord>('importTimestamp', t("atlas.admin.importsList.importedAt"), {
            enableSorting: true,
            enableFiltering: true,
            enableRangeFilter: true,
            dateFormat: 'dd.MM.yyyy HH:mm',
        }),
        createTextColumn<ImportRecord>('batchId', t("atlas.admin.importsList.batchId"), {
            enableSorting: true,
            enableFiltering: false,
        }),
        createActionColumn<ImportRecord>('data', t("atlas.admin.importsList.data"), (row) => (
            <ImportsListDataCell row={row} />
        ), {
            minWidth: '200px',
        }),
        createActionColumn<ImportRecord>('filename', t("atlas.admin.importsList.filename"), (row) => (
            <ImportsListFilenameCell row={row} />
        ), {
            minWidth: '200px',
        }),
        createActionColumn<ImportRecord>('download', '', (row) => (
            <ImportsListDownloadCell row={row} />
        ), {
            minWidth: '150px',
        }),
        createActionColumn<ImportRecord>('delete', '', (row) => (
            <ImportsListDeleteCell 
                row={row} 
                onDelete={handleDelete} 
                deletingBatchId={deletingBatchId}
            />
        ), {
            minWidth: '150px',
        }),
    ], [t, deletingBatchId, handleDelete]);
    
    return (
        <div className="container-fluid">
            <ImportsListFlash 
                flash={flash} 
                onDismiss={() => setFlash(null)} 
            />
            
            <DataTable<ImportRecord>
                endpoint="/api/react/atlasadmin/imports"
                columns={columns}
                fetchData={fetchImports}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
        </div>
    );
}

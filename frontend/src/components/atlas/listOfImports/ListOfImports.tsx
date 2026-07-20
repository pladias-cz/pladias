/**
 * ListOfImports - Imported Records Component
 * 
 * Uses the enterprise DataTable component with custom data fetching
 * to efficiently load imported records with pagination, sorting, and filtering.
 */

import {useState, useMemo, useCallback} from "react";
import {useTranslation} from "react-i18next";
import {
    DataTable,
    type DataTableColumnDef,
    createTimestampColumn,
    createTextColumn,
    createActionColumn,
} from "@/core/dataTable";
import {
    useImportsData,
    useImportsActions,
} from './hooks';
import {
    ImportsFlash,
    ImportsFilenameCell,
} from './components';
import type {ImportRecord, FlashMessage} from './types';

export default function ListOfImports() {
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
    
    // Actions hook - reserved for future use
    useImportsActions(showFlash, t);
    
    // Column definitions
    const columns = useMemo<DataTableColumnDef<ImportRecord>[]>(() => [
        createTimestampColumn<ImportRecord>('importTimestamp', t("atlas.admin.importsList.importedAt"), {
            enableSorting: true,
            enableFiltering: true,
            enableRangeFilter: true,
            dateFormat: 'dd.MM.yyyy HH:mm',
        }),
        createActionColumn<ImportRecord>('filename', t("atlas.admin.importsList.filename"), (row) => (
            <ImportsFilenameCell row={row} />
        ), {
            minWidth: '250px',
        }),
        createTextColumn<ImportRecord>('recordsCount', t("atlas.admin.importsList.records"), {
            enableSorting: true,
            enableFiltering: false,
            minWidth: '80px',
        }),
        createTextColumn<ImportRecord>('warningsCount', t("atlas.admin.importsList.warnings"), {
            enableSorting: true,
            enableFiltering: false,
            minWidth: '80px',
        }),
        createTextColumn<ImportRecord>('id', "ID", {
            enableSorting: true,
            enableFiltering: false,
            minWidth: '80px',
        }),
    ], [t]);
    
    return (
        <div className="container-fluid">
            <ImportsFlash 
                flash={flash} 
                onDismiss={() => setFlash(null)} 
            />
            
            <DataTable<ImportRecord>
                endpoint="/api/react/importResult/imported"
                columns={columns}
                fetchData={fetchImports}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
        </div>
    );
}

/**
 * ListOfControls - Import Controls Component (Validated/Not Imported)
 * 
 * Uses the enterprise DataTable component with custom data fetching
 * to efficiently load import controls with pagination, sorting, and filtering.
 */

import {useState, useMemo, useCallback} from "react";
import {useTranslation} from "react-i18next";
import axios from "axios";
import {
    DataTable,
    type DataTableColumnDef,
    createTimestampColumn,
    createTextColumn,
    createActionColumn,
} from "@/core/dataTable";
import {
    useImportControlsData,
    useImportControlsActions,
} from './hooks';
import {
    ImportControlsFlash,
    ImportControlsFilenameCell,
    ImportControlsDeleteCell,
} from './components';
import type {ImportControlRecord, FlashMessage} from './types';

export default function ListOfControls() {
    const {t} = useTranslation();
    
    // Flash message state
    const [flash, setFlash] = useState<FlashMessage | null>(null);
    
    // Deleting state - tracks ID currently being deleted
    const [deletingId, setDeletingId] = useState<number | null>(null);
    
    // Flash message handler
    const showFlash = useCallback((type: 'success' | 'danger', message: string) => {
        setFlash({type, message});
        setTimeout(() => setFlash(null), 5000);
    }, []);
    
    // Data fetching hook
    const {fetchControls} = useImportControlsData({
        onSuccess: () => {
            // Optional: handle successful data fetch
        }
    });
    
    // Actions hook - reserved for future use
    useImportControlsActions(showFlash, t);
    
    // Delete handler with optimistic update
    const handleDelete = useCallback(async (id: number) => {
        // Set deleting state for optimistic UI
        setDeletingId(id);
        
        try {
            // Make DELETE request
            await axios.delete(`/api/react/importResult/validated/${id}`);
            
            // Success - show flash message
            showFlash('success', t("components.atlasAdmin.importsList.deleteSuccess"));
            
            // Note: DataTable will automatically refresh on next interaction
            // or user can manually refresh the page
        } catch (error) {
            console.error("Delete failed:", error);
            
            // Show error message
            showFlash('danger', t("components.atlasAdmin.importsList.deleteError"));
        } finally {
            // Clear deleting state
            setDeletingId(null);
        }
    }, [showFlash, t]);

    // Column definitions
    const columns = useMemo<DataTableColumnDef<ImportControlRecord>[]>(() => [
        createTimestampColumn<ImportControlRecord>('importTimestamp', t("atlas.admin.importsList.importedAt"), {
            enableSorting: true,
            enableFiltering: true,
            enableRangeFilter: true,
            dateFormat: 'dd.MM.yyyy HH:mm',
        }),
        createActionColumn<ImportControlRecord>('filename', t("atlas.admin.importsList.filename"), (row) => (
            <ImportControlsFilenameCell row={row} />
        ), {
            minWidth: '250px',
        }),
        createTextColumn<ImportControlRecord>('recordsCount', t("atlas.admin.importsList.records"), {
            enableSorting: true,
            enableFiltering: false,
            minWidth: '80px',
        }),
        createTextColumn<ImportControlRecord>('warningsCount', t("atlas.admin.importsList.warnings"), {
            enableSorting: true,
            enableFiltering: false,
            minWidth: '80px',
        }),
        createTextColumn<ImportControlRecord>('errorsCount', t("atlas.admin.importsList.error"), {
            enableSorting: true,
            enableFiltering: false,
            minWidth: '80px',
        }),
        createActionColumn<ImportControlRecord>('delete', t("atlas.admin.importsList.delete"), (row) => (
            <ImportControlsDeleteCell 
                row={row} 
                onDelete={handleDelete}
                isDeleting={deletingId === row.id}
            />
        ), {
            minWidth: '100px',
        }),
    ], [t, handleDelete, deletingId]);
    
    return (
        <div className="container-fluid">
            <ImportControlsFlash 
                flash={flash} 
                onDismiss={() => setFlash(null)} 
            />
            
            <DataTable<ImportControlRecord>
                endpoint="/api/react/importResult/validated"
                columns={columns}
                fetchData={fetchControls}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
        </div>
    );
}

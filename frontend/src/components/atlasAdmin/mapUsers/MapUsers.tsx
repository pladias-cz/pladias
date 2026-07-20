/**
 * MapUsers - Map User Administration Component
 * 
 * Uses the enterprise DataTable component with custom data fetching
 * to efficiently load users and their rights (projects, taxa) on demand.
 */

import {useState, useCallback, useMemo} from "react";
import {useTranslation} from "react-i18next";
import {DataTable, type DataTableColumnDef, createActionColumn, createTextColumn} from "@/core/dataTable";
import {
    useMapUsersData,
    useMapUsersProjects,
    useMapUsersTaxa,
} from './hooks';
import {
    MapUsersFlash,
    MapUsersProjectsCell,
    MapUsersTaxaCell,
    MapUsersAddProjectModal,
    MapUsersAddTaxonModal,
} from './components';
import type {MapUserTableRow, FlashMessage} from './types';

export default function MapUsers() {
    const {t} = useTranslation();
    
    // Flash message state
    const [flash, setFlash] = useState<FlashMessage | null>(null);
    
    // Flash message handler
    const showFlash = useCallback((type: 'success' | 'danger', message: string) => {
        setFlash({type, message});
        setTimeout(() => setFlash(null), 5000);
    }, []);
    
    // Data fetching hook
    const {fetchUsersWithRights} = useMapUsersData({
        onSuccess: () => {
            // Optional: handle successful data fetch
        }
    });
    
    // Projects hook
    const {
        projects,
        projectsLoading,
        selectedProjectId,
        showAddModal,
        handleOpenAddModal,
        handleCloseModal,
        handleAddProject,
        handleRemoveProject,
        setSelectedProjectId,
    } = useMapUsersProjects(showFlash, t);
    
    // Taxa hook
    const {
        taxa,
        taxaLoading,
        taxonSearchTerm,
        submitting,
        selectedTaxon,
        taxonInputRef,
        setTaxonSearchTerm,
        showAddTaxonModal,
        handleOpenAddTaxonModal,
        handleCloseTaxonModal,
        handleSelectTaxon,
    } = useMapUsersTaxa(showFlash, t);
    
    // Handler to convert taxon selection to remove operation
    const handleRemoveTaxonFromCell = useCallback((userId: number, taxonId: number) => {
        // For removal, we call the API directly
        // This is a simplified approach - in production you might want to use a hook
        fetch(`/api/react/atlasadmin/removeUserTaxon/user/${userId}/taxon/${taxonId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showFlash('success', data.message || t("user.usersAdministration.taxonRemoved"));
            } else {
                showFlash('danger', data.message || t("user.usersAdministration.error"));
            }
        })
        .catch(err => {
            console.error("Error removing taxon:", err);
            showFlash('danger', t("user.usersAdministration.error"));
        });
    }, [showFlash, t]);
    
    // Column definitions
    const columns = useMemo<DataTableColumnDef<MapUserTableRow>[]>(() => [
        createTextColumn<MapUserTableRow>('name', t("user.usersAdministration.firstName"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<MapUserTableRow>('surname', t("user.usersAdministration.lastName"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<MapUserTableRow>('email', t("user.usersAdministration.email"), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createActionColumn<MapUserTableRow>('contributionProjects', t("user.usersAdministration.projects"), (row) => (
            <MapUsersProjectsCell
                row={row}
                onAddProject={handleOpenAddModal}
                onRemoveProject={handleRemoveProject}
            />
        ), {
            minWidth: '250px',
        }),
        createActionColumn<MapUserTableRow>('supervisedTaxa', t("user.usersAdministration.supervisedTaxa"), (row) => (
            <MapUsersTaxaCell
                row={row}
                onAddTaxon={handleOpenAddTaxonModal}
                onRemoveTaxon={handleRemoveTaxonFromCell}
            />
        ), {
            minWidth: '250px',
        }),
    ], [t, handleOpenAddModal, handleRemoveProject, handleOpenAddTaxonModal, handleRemoveTaxonFromCell]);
    
    return (
        <div className="container-fluid">
            <MapUsersFlash 
                flash={flash} 
                onDismiss={() => setFlash(null)} 
            />
            
            <DataTable<MapUserTableRow>
                endpoint="/api/react/users"
                columns={columns}
                fetchData={fetchUsersWithRights}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
            
            <MapUsersAddProjectModal
                show={showAddModal}
                projects={projects}
                projectsLoading={projectsLoading}
                selectedProjectId={selectedProjectId}
                onProjectSelect={setSelectedProjectId}
                onAdd={handleAddProject}
                onClose={handleCloseModal}
            />
            
            <MapUsersAddTaxonModal
                show={showAddTaxonModal}
                taxa={taxa}
                taxaLoading={taxaLoading}
                submitting={submitting}
                selectedTaxon={selectedTaxon}
                taxonSearchTerm={taxonSearchTerm}
                taxonInputRef={taxonInputRef}
                onSearchChange={setTaxonSearchTerm}
                onSelectTaxon={handleSelectTaxon}
                onClose={handleCloseTaxonModal}
            />
        </div>
    );
}

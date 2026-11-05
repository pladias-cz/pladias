/**
 * MapUsers - Map User Administration Component
 *
 * Uses the enterprise DataTable component with custom data fetching
 * to efficiently load users and their rights (projects, taxa) on demand.
 */

import {useCallback, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {DataTable, type DataTableColumnDef, createActionColumn, createTextColumn} from '@/core/dataTable';
import {
    useMapUsersData,
    useMapUsersProjects,
    useMapUsersTaxa,
} from './hooks';
import {
    MapUsersProjectsCell,
    MapUsersTaxaCell,
    MapUsersAddProjectModal,
    MapUsersAddTaxonModal,
} from './components';
import type {MapUserTableRow} from './types';
import {removeUserTaxonFromUser} from '@/services/mapAdminApi';
import {apiErrorMessage} from '@/services/apiClient';
import {useNotifications} from '@/stores/notificationStore';

export default function MapUsers() {
    const {t} = useTranslation();
    const {push} = useNotifications();

    // Flash message handler – globální notifikace (sekce F), danger drží, success mizí
    const showFlash = useCallback((type: 'success' | 'danger', message: string) => {
        push({type, message});
    }, [push]);

    // Po každé úspěšné změně práv (přidání/odebrání projektu či taxonu) se zvýší
    // klíč a DataTable znovu načte aktuální stránku – nový stav je ihned viditelný.
    const [rightsRefreshKey, setRightsRefreshKey] = useState(0);
    const bumpRightsRefresh = useCallback(() => setRightsRefreshKey(key => key + 1), []);

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
    } = useMapUsersProjects(showFlash, t, bumpRightsRefresh);

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
    } = useMapUsersTaxa(showFlash, t, bumpRightsRefresh);

    // Handler to convert taxon selection to remove operation
    const handleRemoveTaxonFromCell = useCallback((userId: number, taxonId: number) => {
        removeUserTaxonFromUser(userId, taxonId)
            .then(() => {
                showFlash('success', t('user.usersAdministration.taxonRemoved'));
                bumpRightsRefresh();
            })
            .catch(err => {
                showFlash('danger', apiErrorMessage(err, t('user.usersAdministration.error')));
            });
    }, [showFlash, t, bumpRightsRefresh]);

    // Column definitions
    const columns = useMemo<DataTableColumnDef<MapUserTableRow>[]>(() => [
        createTextColumn<MapUserTableRow>('name', t('user.usersAdministration.firstName'), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<MapUserTableRow>('surname', t('user.usersAdministration.lastName'), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createTextColumn<MapUserTableRow>('email', t('user.usersAdministration.email'), {
            enableSorting: true,
            enableFiltering: true,
        }),
        createActionColumn<MapUserTableRow>('contributionProjects', t('user.usersAdministration.projects'), (row) => (
            <MapUsersProjectsCell
                row={row}
                onAddProject={handleOpenAddModal}
                onRemoveProject={handleRemoveProject}
            />
        ), {
            minWidth: '250px',
        }),
        createActionColumn<MapUserTableRow>('supervisedTaxa', t('user.usersAdministration.supervisedTaxa'), (row) => (
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
            <DataTable<MapUserTableRow>
                endpoint="/api/react/atlasadmin/users"
                columns={columns}
                fetchData={fetchUsersWithRights}
                initialPageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                refreshKey={rightsRefreshKey}
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

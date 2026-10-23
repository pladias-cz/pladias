/**
 * Hook for MapUsers project operations
 */

import {useCallback, useState} from 'react';
import {getProjects} from '@/services/searchApi';
import {assignProjectToUser, removeProjectFromUser} from '@/services/mapAdminApi';
import {apiErrorMessage} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';
import type {TFunction} from 'i18next';
import type {Project} from '../types';

export interface UseMapUsersProjectsReturn {
    projects: Project[];
    projectsLoading: boolean;
    selectedUserId: number | null;
    selectedProjectId: string;
    showAddModal: boolean;
    fetchProjects: () => Promise<void>;
    handleOpenAddModal: (userId: number) => void;
    handleCloseModal: () => void;
    handleAddProject: () => Promise<void>;
    handleRemoveProject: (userId: number, projectId: number) => Promise<void>;
    setSelectedProjectId: (id: string) => void;
}

export function useMapUsersProjects(
    showFlash: (type: 'success' | 'danger', message: string) => void,
    t: TFunction,
    onProjectChange?: () => void
): UseMapUsersProjectsReturn {
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");

    const fetchProjects = useCallback(async () => {
        setProjectsLoading(true);
        try {
            setProjects(await getProjects());
        } catch (err) {
            notifyApiError(err, t("common.loadFailed"));
        } finally {
            setProjectsLoading(false);
        }
    }, [t]);

    const handleOpenAddModal = useCallback((userId: number) => {
        setSelectedUserId(userId);
        setSelectedProjectId("");
        fetchProjects();
        setShowAddModal(true);
    }, [fetchProjects]);

    const handleCloseModal = useCallback(() => {
        setShowAddModal(false);
        setSelectedUserId(null);
        setSelectedProjectId("");
    }, []);

    const handleAddProject = useCallback(async () => {
        if (!selectedUserId || !selectedProjectId) {
            showFlash('danger', t("user.usersAdministration.selectProject"));
            return;
        }

        try {
            await assignProjectToUser(selectedUserId, parseInt(selectedProjectId, 10));

            showFlash('success', t("user.usersAdministration.projectAdded"));
            handleCloseModal();
            onProjectChange?.();
        } catch (err) {
            showFlash('danger', apiErrorMessage(err, t("user.usersAdministration.error")));
        }
    }, [selectedUserId, selectedProjectId, showFlash, t, handleCloseModal, onProjectChange]);

    const handleRemoveProject = useCallback(async (userId: number, projectId: number) => {
        try {
            await removeProjectFromUser(userId, projectId);

            showFlash('success', t("user.usersAdministration.projectRemoved"));
            onProjectChange?.();
        } catch (err) {
            showFlash('danger', apiErrorMessage(err, t("user.usersAdministration.error")));
        }
    }, [showFlash, t, onProjectChange]);

    return {
        projects,
        projectsLoading,
        selectedUserId,
        selectedProjectId,
        showAddModal,
        fetchProjects,
        handleOpenAddModal,
        handleCloseModal,
        handleAddProject,
        handleRemoveProject,
        setSelectedProjectId,
    };
}

/**
 * Hook for MapUsers project operations
 */

import {useCallback, useState} from 'react';
import axios from 'axios';
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
    t: (key: string) => string,
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
            const response = await axios.get("/api/react/occurrence/projects");
            if (response.data?.success) {
                setProjects(response.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching projects:", err);
        } finally {
            setProjectsLoading(false);
        }
    }, []);

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
            const response = await fetch("/api/react/users/rights/edit", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    userId: selectedUserId,
                    key: "AddProject",
                    value: parseInt(selectedProjectId, 10)
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showFlash('success', data.message || t("user.usersAdministration.projectAdded"));
                handleCloseModal();
                onProjectChange?.();
            } else {
                showFlash('danger', data.message || t("user.usersAdministration.error"));
            }
        } catch (err) {
            console.error("Error adding project:", err);
            showFlash('danger', t("user.usersAdministration.error"));
        }
    }, [selectedUserId, selectedProjectId, showFlash, t, handleCloseModal, onProjectChange]);

    const handleRemoveProject = useCallback(async (userId: number, projectId: number) => {
        try {
            const response = await fetch("/api/react/users/rights/edit", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    userId,
                    key: "RemoveProject",
                    value: projectId
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showFlash('success', data.message || t("user.usersAdministration.projectRemoved"));
                onProjectChange?.();
            } else {
                showFlash('danger', data.message || t("user.usersAdministration.error"));
            }
        } catch (err) {
            console.error("Error removing project:", err);
            showFlash('danger', t("user.usersAdministration.error"));
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

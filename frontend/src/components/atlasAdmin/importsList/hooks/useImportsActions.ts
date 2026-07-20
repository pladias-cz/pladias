import {useState, useCallback} from 'react';

export interface UseImportsActionsReturn {
    deletingBatchId: number | null;
    handleDelete: (batchId: number) => Promise<void>;
    setDeletingBatchId: (id: number | null) => void;
}

export function useImportsActions(
    showFlash: (type: 'success' | 'danger', message: string) => void,
    t: (key: string) => string,
    onImportChange?: () => void
): UseImportsActionsReturn {
    const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);

    const handleDelete = useCallback(async (batchId: number) => {
        setDeletingBatchId(batchId);
        try {
            const response = await fetch(`/api/react/atlasadmin/prepareBatchDelete/${batchId}`);
            const json = await response.json();
            
            if (response.ok && json.success) {
                showFlash('success', t("atlas.admin.importsList.markedForDeletion"));
                onImportChange?.();
            } else {
                showFlash('danger', json.data?.message || t("atlas.admin.importsList.error"));
            }
        } catch (err) {
            console.error("Error deleting import:", err);
            showFlash('danger', t("atlas.admin.importsList.error"));
        } finally {
            setDeletingBatchId(null);
        }
    }, [showFlash, t, onImportChange]);

    return {
        deletingBatchId,
        handleDelete,
        setDeletingBatchId,
    };
}

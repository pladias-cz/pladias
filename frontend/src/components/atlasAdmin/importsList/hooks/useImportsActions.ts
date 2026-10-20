import {useState, useCallback} from 'react';
import type {TFunction} from 'i18next';
import {prepareBatchDelete} from '@/services/importApi';
import {apiErrorMessage} from '@/services/apiClient';

export interface UseImportsActionsReturn {
    deletingBatchId: number | null;
    handleDelete: (batchId: number) => Promise<void>;
    setDeletingBatchId: (id: number | null) => void;
}

export function useImportsActions(
    showFlash: (type: 'success' | 'danger', message: string) => void,
    t: TFunction,
    onImportChange?: () => void
): UseImportsActionsReturn {
    const [deletingBatchId, setDeletingBatchId] = useState<number | null>(null);

    const handleDelete = useCallback(async (batchId: number) => {
        setDeletingBatchId(batchId);
        try {
            await prepareBatchDelete(batchId);
            showFlash('success', t("atlas.admin.importsList.markedForDeletion"));
            onImportChange?.();
        } catch (err) {
            showFlash('danger', apiErrorMessage(err, t("atlas.admin.importsList.error")));
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

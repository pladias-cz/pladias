import {useState, useCallback} from 'react';

export interface UseImportControlsActionsReturn {
    processingId: number | null;
    handleAction: (id: number, action: string) => Promise<void>;
    setProcessingId: (id: number | null) => void;
}

export function useImportControlsActions(
    showFlash: (type: 'success' | 'danger', message: string) => void,
    t: (key: string) => string,
    onDataChange?: () => void
): UseImportControlsActionsReturn {
    const [processingId, setProcessingId] = useState<number | null>(null);

    const handleAction = useCallback(async (id: number, action: string) => {
        setProcessingId(id);
        try {
            // Placeholder for future actions - can be extended based on requirements
            const response = await fetch(`/api/react/importResult/${action}/${id}`, {
                method: 'POST',
            });
            const json = await response.json();
            
            if (response.ok && json.success) {
                showFlash('success', t("components.atlasAdmin.importControls.actionSuccess"));
                onDataChange?.();
            } else {
                showFlash('danger', json.data?.message || t("components.atlasAdmin.importControls.error"));
            }
        } catch (err) {
            console.error("Error performing action:", err);
            showFlash('danger', t("components.atlasAdmin.importControls.error"));
        } finally {
            setProcessingId(null);
        }
    }, [showFlash, t, onDataChange]);

    return {
        processingId,
        handleAction,
        setProcessingId,
    };
}

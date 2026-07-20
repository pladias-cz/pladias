import {useCallback, useState} from 'react';
import type {ImportResult, ImportError, ImportOperation} from '../types';

export interface UseImportDataOptions {
    onSuccess?: (result: ImportResult) => void;
    onError?: (error: ImportError) => void;
}

export function useImportData(options: UseImportDataOptions = {}) {
    const {onSuccess, onError} = options;
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const uploadFile = useCallback(async (
        file: File,
        operation: ImportOperation,
        projectId?: number
    ): Promise<ImportResult | ImportError> => {
        setIsUploading(true);
        setProgress(0);

        const formData = new FormData();
        formData.append('fileUpload', file);
        formData.append('operation', operation);
        if (projectId !== undefined) {
            formData.append('project', String(projectId));
        }

        try {
            // Fake URL - backend not ready yet
            const endpoint = operation === 'validation' 
                ? '/api/react/import/validate' 
                : '/api/react/import/upload';

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errorMessage || 'Upload failed');
            }

            const result: ImportResult = await response.json();
            setProgress(100);
            
            onSuccess?.(result);
            return result;
        } catch (error: any) {
            const errorResult: ImportError = {
                errorMessage: error.message || 'Unknown error occurred',
            };
            onError?.(errorResult);
            return errorResult;
        } finally {
            setIsUploading(false);
        }
    }, [onSuccess, onError]);

    const resetProgress = useCallback(() => {
        setProgress(0);
    }, []);

    return {
        uploadFile,
        isUploading,
        progress,
        resetProgress,
    };
}

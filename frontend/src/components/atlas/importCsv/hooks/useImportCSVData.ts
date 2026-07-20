import {useCallback, useState} from 'react';
import type {ImportError, ImportOperation} from '../types';

export interface UseImportCSVDataOptions {
    onSuccess?: () => void;
    onError?: (error: ImportError) => void;
}

export function useImportCSVData(options: UseImportCSVDataOptions = {}) {
    const {onSuccess, onError} = options;
    const [isUploading, setIsUploading] = useState(false);

    const uploadFile = useCallback(async (
        file: File,
        operation: ImportOperation,
        projectId: number
    ): Promise<void | ImportError> => {
        setIsUploading(true);

        const formData = new FormData();
        formData.append('fileUpload', file);
        formData.append('operation', operation);
        formData.append('project', String(projectId));

        try {
            const endpoint = '/api/react/import/csv';

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.errorMessage || 'Upload failed');
            }

            const result = await response.json();
            
            if (result.success) {
                onSuccess?.();
            } else {
                throw new Error(result.errorMessage || 'Upload failed');
            }
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

    return {
        uploadFile,
        isUploading,
    };
}

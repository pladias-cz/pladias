import {useCallback, useState} from 'react';
import type {ImportError, ImportOperation} from '../types';
import {importCsv} from '@/services/importApi';

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

        try {
            await importCsv(file, operation, projectId);
            onSuccess?.();
        } catch (error) {
            const errorResult: ImportError = {
                errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
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

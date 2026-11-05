import {useCallback, useState} from 'react';
import type {ImportResult, ImportError, ImportOperation} from '../types';
import {importExcel} from '@/services/importApi';

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

        try {
            const result = await importExcel(file, operation, projectId);
            setProgress(100);

            onSuccess?.(result);
            return result;
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

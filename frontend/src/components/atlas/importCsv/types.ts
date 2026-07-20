/**
 * Types for CSV import functionality
 */

export type ImportOperation = 'validation' | 'import';

export interface ImportError {
    errorMessage: string;
}

export interface ImportCSVStatus {
    isUploading: boolean;
}

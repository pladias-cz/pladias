/**
 * Types for Excel import functionality
 */

export interface Project {
    id: number;
    name: string;
}

export interface ImportResult {
    id: number;
    filename: string;
    records: number;
    errors: number;
    warnings: number;
    imported: boolean;
    decoratedFileUrl?: string;
}

export interface ImportError {
    errorMessage: string;
}

export type ImportOperation = 'validation' | 'import';

export interface ImportStatus {
    isProcessing: boolean;
    progress: number;
}

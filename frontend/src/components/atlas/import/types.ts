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
    /** nastaveno při importu, který zamítla kontrolní validace (soubor není validní) */
    errorCode?: 'fileNotValid';
}

export interface ImportError {
    errorMessage: string;
}

export type ImportOperation = 'validation' | 'import';

export interface ImportStatus {
    isProcessing: boolean;
    progress: number;
}

/**
 * Type definitions for ListOfControls component
 */

export interface ImportControlRecord {
    id: number;
    filename: string;
    warningsCount: number;
    errorsCount: number;
    infosCount: number;
    recordsCount: number;
    batchId: number | null;
    imported: boolean | null;
    importTimestamp: string;
    committerId: number | null;
    committerName: string;
    committerEmail: string;
    hasDeletionCode: boolean;
}

export interface FlashMessage {
    type: 'success' | 'danger';
    message: string;
}

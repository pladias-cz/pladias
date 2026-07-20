/**
 * Type definitions for ImportsList component
 */

export interface ImportRecord {
    id: number;
    filename: string;
    warningsCount: number;
    errorsCount: number;
    infosCount: number;
    recordsCount: number;
    batchId: number;
    imported: boolean;
    importTimestamp: string;
    committerId: number;
    committerName: string;
    committerEmail: string;
    hasDeletionCode: boolean;
}

export interface FlashMessage {
    type: 'success' | 'danger';
    message: string;
}

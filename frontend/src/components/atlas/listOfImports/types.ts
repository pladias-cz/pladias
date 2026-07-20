/**
 * Type definitions for ListOfImports component
 */

export interface ImportRecord {
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

/**
 * Typy hromadných úprav (atlas/search/bulkEdit).
 */

import type {BulkOperationFailure} from '../bulkEditOperations';

/** Možnost semaforu (validačního statusu) v hromadných úpravách. */
export type SemaforOption = {
    value: string;
    label: string;
};

/** Souhrn dokončené dávky – úspěšná i chybná ID záznamů. */
export type BulkOperationSummary = {
    operationName: string;
    successIds: number[];
    failed: BulkOperationFailure[];
};

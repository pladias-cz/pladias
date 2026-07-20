/**
 * Type definitions for TaxaList component
 */

export interface TaxonMapSettings {
    taxonId: number;
    taxonNameLat: string;
    taxonRankCz: string;
    isMapped: boolean;
    commonThreshold: number;
    isProtected: boolean;
    preslia: string;
    revisors: string;
    revisorsComment: string;
    revisorsPrintComment: string | null;
    revisionStatusId: number;
    revisionStatusDescription: string;
    publicationStatusId: number;
    publicationStatusDescription: string;
    lastEditTimestamp: number;
    parentTaxonId?: number | null;
    parentTaxonNameLat?: string | null;
    csvMapDetailId?: number | null;
    csvMapDetailTimestamp?: number | null;
    hasPng: boolean;
    currentUserIsRevisor?: boolean;
    mapType?: number;
}

export interface StatusOption {
    id: number;
    description?: string;
    name?: string;
    color?: string;
    icon?: string;
    priority: number;
}

export interface TaxonOption {
    id: number;
    nameLat: string;
}

export interface FlashMessage {
    type: 'success' | 'danger';
    message: string;
}

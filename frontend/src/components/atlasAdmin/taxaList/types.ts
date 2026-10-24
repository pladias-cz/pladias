/**
 * Type definitions for TaxaList component
 */

// sdílený model (sekce J.2/C.4): re-export kvůli existujícím importům
export type {TaxonMapSettings} from '@/models/TaxonMapSettings';

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


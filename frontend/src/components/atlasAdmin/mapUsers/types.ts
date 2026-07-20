/**
 * Type definitions for MapUsers component
 */

export interface Project {
    id: number;
    name: string;
    abbrev?: string;
}

export interface SupervisedTaxon {
    id: number;
    nameLat: string;
}

export interface UserRights {
    userId: number;
    contributionProjects: Project[];
    supervisedTaxa: SupervisedTaxon[];
}

export interface MapUserTableRow {
    id: number;
    name: string;
    surname: string;
    email: string;
    mapAdmin: boolean;
    traitAdmin: boolean;
    sysAdmin: boolean;
    biblioAdmin: boolean;
    taxonAdmin: boolean;
    deleted: boolean;
    contributionProjects: Project[];
    supervisedTaxa: SupervisedTaxon[];
}

export interface FlashMessage {
    type: 'success' | 'danger';
    message: string;
}

/**
 * Type definitions for TaxaList component
 */

export interface TaxonMapSettings {
    /** PK atlas.taxon_mapsettings – u 1:1 relace s taxonem totožné s taxonId;
     *  DataTable optimistická vrstva checkboxů podle něj matchuje řádky. */
    id: number;
    taxonId: number;
    taxonNameLat: string;
    taxonRankCz: string;
    isMapped: boolean;
    commonThreshold: number;
    isProtected: boolean;
    preslia: string;
    revisors: string;
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


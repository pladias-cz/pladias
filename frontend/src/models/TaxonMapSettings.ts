/**
 * Nastavení mapy taxonu – `GET /api/react/atlas/taxonMapSettings/{id}`
 * (dříve lokální DTO v komponentách mapPreview/mapMain a type v komponentách
 * TaxaList; v rámci improvements 2.4 se duplicitní types.ts z obou variant
 * TaxaList odstranily – importuje se odsud).
 */
export interface TaxonMapSettings {
    /** PK atlas.taxon_mapsettings – u 1:1 relace s taxonem totožné s taxonId. */
    id: number;
    taxonId: number;
    taxonNameLat: string;
    taxonRankCz: string;
    isMapped: boolean;
    commonThreshold: number;
    isProtected: boolean;
    preslia: string;
    revisors: string;
    revisorsComment: string | null;
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

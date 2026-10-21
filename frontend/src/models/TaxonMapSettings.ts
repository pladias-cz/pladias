/**
 * Nastavení mapy taxonu – `GET /api/react/atlas/taxonMapSettings/{id}`
 * (dříve lokální DTO v komponentách mapPreview/mapMain a type v
 * `components/atlas/taxaList/types`, kam se re-exportuje).
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

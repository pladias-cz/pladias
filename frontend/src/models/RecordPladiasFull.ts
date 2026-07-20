import type { RecordPladias } from './RecordPladias';
import type { QuadrantDetail, DistrictDetail } from './GeoTypes';

/**
 * Taxon detail with rank and parent info
 */
export interface TaxonDetail {
    id: number;
    nameLat: string;
    nameCz: string | null;
    author: string | null;
    rank: TaxonRankDetail | null;
    parentId: number | null;
    hybridParentage: string | null;
}

/**
 * Taxon rank detail
 */
export interface TaxonRankDetail {
    id: number;
    name: string;
}

/**
 * Record author with full details
 */
export interface RecordAuthorFull {
    recordId: number | null;
    authorId: number;
    authorName: string | null;
    authorSurname: string;
    authorFullName: string;
    succession: number | null;
}

/**
 * Batch processing detail with user info
 */
export interface BatchDetail {
    id: number;
    authorId: number | null;
    authorName: string | null;
    committerId: number | null;
    committerName: string | null;
    createTimestamp: string | null;
    imported: boolean | null;
    deletionCode: string | null;
}

/**
 * Bibliography reference detail
 */
export interface BibliographyDetail {
    id: number;
    citation: string | null;  // authors field from backend
    title: string | null;
    year: string | null;
    isbn: string | null;
    issn: string | null;
}


/**
 * Map square detail with centroid
 */
export interface MapSquareDetail {
    id: number;
    code: string;
    centroidLon: number | null;
    centroidLat: number | null;
}

/**
 * License detail with description
 */
export interface LicenseDetail {
    id: number;
    key: string;
    description: string | null;
}

/**
 * Extended Record interface with full relationship data
 * Matches backend RecordPladiasFullDto
 */
export interface RecordPladiasFull extends RecordPladias {
    // Extended fields - Taxon details
    taxon: TaxonDetail;
    
    // Extended fields - Record authors with full details
    recordAuthors: RecordAuthorFull[];
    
    // Extended fields - Batch with full details
    batch: BatchDetail;
    
    // Extended fields - Bibliography reference
    bibliography: BibliographyDetail | null;
    
    // Extended fields - Nearest town legacy district details
    nearestTownLegacy: DistrictDetail | null;
    
    // Extended fields - Map squares with quadrant info
    mapSquares: MapSquareDetail[];
    
    // Extended fields - Quadrants with square info
    quadrants: QuadrantDetail[];
    
    // Extended fields - License with description
    license: LicenseDetail | null;

    // Computed location values based on GPS coordinates (ST_intersects)
    quadrantCodeComputed: string | null;
    phytochorionRelationId: string | null;
    phytochorionRelationName: string | null;
    phytochorionComputed: string | null;  // Format: "phytoId.name" (e.g., "4202_01_a.Phylum name")
    districtComputed: string | null;
}

/**
 * Response type for basic record endpoint
 */
export interface RecordResponse {
    success: boolean;
    data: RecordPladias | null;
    error?: string;
}

/**
 * Extended response type for full record endpoint
 */
export interface RecordFullResponse {
    success: boolean;
    data: RecordPladiasFull | null;
    error?: string;
}
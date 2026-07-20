/**
 * Quadrant detail with square reference
 */
export interface QuadrantDetail {
    id: number;
    code: string;
    quadrantLetter: string;
    squareId: number | null;
    squareCode: string | null;
}

/**
 * District detail with type info
 */
export interface DistrictDetail {
    id: number;
    name: string;
    abbrev: string | null;
    identifier: string | null;
    districtTypeId: number | null;
    districtTypeName: string | null;
}

/**
 * Town hierarchy entry for reverse geocoding
 * Extends DistrictDetail with optional districtType name
 */
export interface TownHierarchyEntry {
    town: DistrictDetail & { districtType?: { name?: string } };
}

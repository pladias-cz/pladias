import type { DistrictDetail, QuadrantDetail, TownHierarchyEntry } from './GeoTypes';

/**
 * Reverse geocoding response from GET /react/query/reverseGeocoding/lon/:lon/lat/:lat
 * After merging the backend's array response, this is a single object with all properties
 */
export interface ReverseGeocodingResponse {
    quadrant?: QuadrantDetail;
    district?: DistrictDetail;
    townHierarchy?: TownHierarchyEntry[];
    phytochorions?: PhytochorionEntry[];
}

export interface PhytochorionEntry {
    phytochorion: {
        rowid: number;
        phytoId: string;
        name: string;
        district: string;
        detailedName: string;
    };
}
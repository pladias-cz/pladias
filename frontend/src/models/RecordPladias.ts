export interface RecordPladias {
    id: number;
    taxonOriginal: string;
    
    // Taxon information
    taxonId: number | null;
    taxonNameLat: string | null;
    taxonNameHtml: string | null;
    
    latitude: number | null;
    longitude: number | null;
    gpsPrecision: number | null;
    gpsCoordsSource: string | null;
    year: number | null;
    datePrecision: string | null;
    dateIso: string | null;
    validationStatusId: number | null;
    validationStatusColor: string | null;
    validationStatusDescription: string | null;
    originalityStatusId: number | null;
    originalityStatusName: string | null;
    originalityStatusIcon: string | null;
    batchAuthorId: number | null;
    batchAuthorName: string | null;
    batchCommitterId: number | null;
    batchCommitterName: string | null;
    recordAuthorsNames: string | null;  // Prerendered concatenated author names
    computedQuadrantCode: string | null;
    computedSquareCode: string | null;
    districtId: number | null;
    districtName: string | null;
    nearestTownId: number | null;
    nearestTownName: string | null;
    nearestTownText: string | null;
    phytochorionPhytoId: string | null;
    phytochorionName: string | null;
    isPhytochorionComputed: boolean | null;
    quadrantsCodes: string | null;  // Prerendered concatenated legacy quadrant and square codes
    altitudeMin: number | null;
    altitudeMax: number | null;
    altitudeApproximation: boolean | null;
    locality: string | null;
    environment: string | null;
    detrev: string | null;
    
    // Nonvascular-specific fields
    substrate: string | null;
    chemical: string | null;
    localityExtra: string | null;
    substrateCategoryText: string | null;
    
    comment: string | null;
    remarkExcerption: string | null;
    remarkOther: string | null;
    remarkDoubt: string | null;
    unresolvedCommentsCount: number | null;
    // Comments are now loaded separately via async endpoint
    comments?: Array<{
        id: number;
        authorId: number | null;
        authorName: string | null;
        message: string | null;
        createTimestamp: string | null;
        resolved: boolean | null;
        resolvedById: number | null;
        resolvedByName: string | null;
        resolvedTimestamp: string | null;
        deleted: boolean | null;
    }>;
    herbariums: Array<{
        id: number;
        name: string;
        label: string;
    }>;
    herbariumQuality: boolean | null;
    source: string | null;
    originalId: string | null;
    licenseId: number | null;
    licenseName: string | null;
    projectId: number | null;
    projectName: string | null;
    institutionName: string | null;
    locked: boolean | null;
    includedInMap: boolean | null;
    hasHistory: boolean | null;
    lastEditTimestamp: string | null;
    createTimestamp: string | null;
    // For editing - timestamp as number for conflict detection
    lastEditTimestampNum?: number;
    
    // Edit permission
    canEdit: boolean;
}
export interface TaxonStats {
    recordsTotal: number;
    recordsAccepted: number;
    recordsDeclined: number;
    recordsUncertain: number;
    recordsUnprocessed: number;

    recordsIncludedInMap: number;
    recordsCommented: number;
    recordsUncommented: number;

    recordsBoundToQuadrants: number;
    recordsBoundToSquares: number;
    recordsBoundToCoords: number;
    recordsNotBoundToCoords: number;

    quadrantsValidated: number;
    quadrantsUncertain: number;
    quadrantsDeclined: number;
    quadrantsUnprocessed: number;

    recordsByProject: Record<string, number>[];
}
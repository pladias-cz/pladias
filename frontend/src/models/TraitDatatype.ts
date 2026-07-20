export interface TraitDatatype {
    id: number;
    name: string;
    nameCz: string;
    description?: string | null;
    multiplicity: boolean;
    dominance: boolean;
    frequency: boolean;
    comment: boolean;
    immeasurability: boolean;
}

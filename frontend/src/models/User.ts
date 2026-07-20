export type UserRole =
    | "mapAdmin"
    | "bulkEditor"
    | "traitAdmin"
    | "sysAdmin"
    | "taxonAdmin"
    | "asyncImporter";

export interface UserData {
    id: number;
    isMapAdmin?: boolean;
    isBulkEditor?: boolean;
    isTraitAdmin?: boolean;
    isSysAdmin?: boolean;
    isTaxonAdmin?: boolean;
    isAsyncImporter?: boolean;
    userEmail?: string;
    language?: string;
    supervisedTaxonIds?: number[];
}

export default class User {
    readonly id: number;
    readonly isMapAdmin: boolean;
    readonly isBulkEditor: boolean;
    readonly isTraitAdmin: boolean;
    readonly isSysAdmin: boolean;
    readonly isTaxonAdmin: boolean;
    readonly isAsyncImporter: boolean;
    readonly userEmail: string;
    readonly language: string;
    readonly supervisedTaxonIds: number[];

    constructor(data: UserData) {
        this.id = data.id;
        this.isMapAdmin = data.isMapAdmin ?? false;
        this.isBulkEditor = data.isBulkEditor ?? false;
        this.isTraitAdmin = data.isTraitAdmin ?? false;
        this.isSysAdmin = data.isSysAdmin ?? false;
        this.isTaxonAdmin = data.isTaxonAdmin ?? false;
        this.isAsyncImporter = data.isAsyncImporter ?? false;
        this.userEmail = data.userEmail ?? "";
        this.language = data.language ?? "cs";
        this.supervisedTaxonIds = data.supervisedTaxonIds ?? [];
    }

    hasRole(role: UserRole): boolean {
        switch (role) {
            case "mapAdmin": return this.isMapAdmin;
            case "bulkEditor": return this.isBulkEditor;
            case "traitAdmin": return this.isTraitAdmin;
            case "sysAdmin": return this.isSysAdmin;
            case "taxonAdmin": return this.isTaxonAdmin;
            case "asyncImporter": return this.isAsyncImporter;
            default: return false;
        }
    }

    isSupervisorOfTaxon(taxonId: number): boolean {
        return this.supervisedTaxonIds.includes(taxonId);
    }
}

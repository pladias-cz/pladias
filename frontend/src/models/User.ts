import type {UserRole} from "./UserRole";

export interface UserData {
    id: number;
    /** Role přiřazené backendem (`/api/react/config`, zdroj `UserRole.keysOf`) – viz `models/UserRole.ts`. */
    roles?: UserRole[];
    userEmail?: string;
    language?: string;
    supervisedTaxonIds?: number[];
}

export default class User {
    readonly id: number;
    readonly roles: UserRole[];
    readonly userEmail: string;
    readonly language: string;
    readonly supervisedTaxonIds: number[];

    constructor(data: UserData) {
        this.id = data.id;
        this.roles = data.roles ?? [];
        this.userEmail = data.userEmail ?? "";
        this.language = data.language ?? "cs";
        this.supervisedTaxonIds = data.supervisedTaxonIds ?? [];
    }

    hasRole(role: UserRole): boolean {
        return this.roles.includes(role);
    }

    // Derived role flags (kept for readability at call sites; mapAdmin implies bulkEditor, see backend UserRole.keysOf)

    get isMapAdmin(): boolean {
        return this.hasRole("mapAdmin");
    }

    get isBulkEditor(): boolean {
        return this.hasRole("bulkEditor");
    }

    get isTraitAdmin(): boolean {
        return this.hasRole("traitAdmin");
    }

    get isSysAdmin(): boolean {
        return this.hasRole("sysAdmin");
    }

    get isTaxonAdmin(): boolean {
        return this.hasRole("taxonAdmin");
    }

    get isAsyncImporter(): boolean {
        return this.hasRole("asyncImporter");
    }

    get isBiblioAdmin(): boolean {
        return this.hasRole("biblioAdmin");
    }

    isSupervisorOfTaxon(taxonId: number): boolean {
        return this.supervisedTaxonIds.includes(taxonId);
    }
}

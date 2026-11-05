import {EXTERNAL_PROJECTS, type ExternalProject} from './AtlasRecords';

export interface InstanceConfigData {
    isVascular?: boolean;
    hasAtlasModule?: boolean;
    hasBiblioModule?: boolean;
    hasMeasurementsModule?: boolean;
    /** Excerpční projekty (conf `atlas.excerptionProjectIds`) – ID dle DB dané instance. */
    excerptionProjectIds?: number[];
    /** NDOP projekty (conf `atlas.ndopProjectIds`) – ID dle DB dané instance. */
    ndopProjectIds?: number[];
    /** Externí zdroje záznamů mapového detailu (conf `atlas.externalRecordSources`). */
    externalRecordSources?: ExternalProject[];
}

/** Modul instance dostupný podle konfigurace (`ConfigController.config`). */
export type InstanceModule = 'atlas' | 'biblio' | 'measurements';

class InstanceConfig {
    isVascular: boolean;
    hasAtlasModule: boolean;
    hasBiblioModule: boolean;
    hasMeasurementsModule: boolean;
    /** Excerpční projekty (conf `atlas.excerptionProjectIds`) – ID dle DB dané instance. */
    readonly excerptionProjectIds: number[];
    /** NDOP projekty (conf `atlas.ndopProjectIds`) – ID dle DB dané instance. */
    readonly ndopProjectIds: number[];
    /** Externí zdroje záznamů dostupné v instanci – omezují taby/markery map detailu. */
    readonly externalRecordSources: ExternalProject[];

    constructor(data: InstanceConfigData) {
        this.isVascular = data.isVascular || false;
        this.hasAtlasModule = data.hasAtlasModule || false;
        this.hasBiblioModule = data.hasBiblioModule || false;
        this.hasMeasurementsModule = data.hasMeasurementsModule || false;
        this.excerptionProjectIds = data.excerptionProjectIds ?? [];
        this.ndopProjectIds = data.ndopProjectIds ?? [];
        // Chybějící klíč (starší backend bez konfigurace) = všechny externí
        // zdroje, tj. dřívější chování.
        this.externalRecordSources = data.externalRecordSources ?? [...EXTERNAL_PROJECTS];
    }

    /**
     * Declarativní dostupnost modulu – přidání nového modulu = jeden řádek tady,
     * ne úprava `ProtectedRoute`.
     */
    hasModule(module: InstanceModule): boolean {
        switch (module) {
            case 'atlas':
                return this.hasAtlasModule;
            case 'biblio':
                return this.hasBiblioModule;
            case 'measurements':
                return this.hasMeasurementsModule;
        }
    }

    /**
     * Excerpční projekt (conf `atlas.excerptionProjectIds`) – v tabulce záznamů
     * oddělovač a checkbox herbářové revize. Null-safe: `RecordPladias.projectId`
     * je nullable.
     */
    isExcerptionProject(projectId: number | null | undefined): boolean {
        return projectId != null && this.excerptionProjectIds.includes(projectId);
    }

    /**
     * NDOP projekt (conf `atlas.ndopProjectIds`) – v tabulce záznamů přímý odkaz
     * na kartu nálezu. Null-safe: `RecordPladias.projectId` je nullable.
     */
    isNdopProject(projectId: number | null | undefined): boolean {
        return projectId != null && this.ndopProjectIds.includes(projectId);
    }

    /**
     * Dostupnost externího zdroje záznamů v map detailu (taby InfoPanelu, markery
     * na mapě). PLADIAS není externí zdroj – vlastní data jsou dostupná vždy.
     */
    hasExternalRecordSource(source: ExternalProject): boolean {
        return this.externalRecordSources.includes(source);
    }
}

export default InstanceConfig;

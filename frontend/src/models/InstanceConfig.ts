export interface InstanceConfigData {
    isVascular?: boolean;
    hasAtlasModule?: boolean;
    hasBiblioModule?: boolean;
    hasMeasurementsModule?: boolean;
}

/** Modul instance dostupný podle konfigurace (`ConfigController.config`). */
export type InstanceModule = "atlas" | "biblio" | "measurements";

class InstanceConfig {
    isVascular: boolean;
    hasAtlasModule: boolean;
    hasBiblioModule: boolean;
    hasMeasurementsModule: boolean;

    constructor(data: InstanceConfigData) {
        this.isVascular = data.isVascular || false;
        this.hasAtlasModule = data.hasAtlasModule || false;
        this.hasBiblioModule = data.hasBiblioModule || false;
        this.hasMeasurementsModule = data.hasMeasurementsModule || false;
    }

    /**
     * Declarativní dostupnost modulu – přidání nového modulu = jeden řádek tady,
     * ne úprava `ProtectedRoute`.
     */
    hasModule(module: InstanceModule): boolean {
        switch (module) {
            case "atlas":
                return this.hasAtlasModule;
            case "biblio":
                return this.hasBiblioModule;
            case "measurements":
                return this.hasMeasurementsModule;
        }
    }
}

export default InstanceConfig;

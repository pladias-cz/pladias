interface InstanceConfigData {
    isVascular?: boolean;
    hasAtlasModule?: boolean;
    hasBiblioModule?: boolean;
    hasMeasurementsModule?: boolean;
}

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
}

export default InstanceConfig;

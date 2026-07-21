package service.trait.detailexport;

import models.traits.InheritanceType;
import models.traits.Trait;
import service.trait.detailexport.csv.TraitDetailsExportCsvBuilder;
import service.trait.detailexport.excel.TraitDetailsExportExcelBuilder;

public class DetailedExportBuilderFactory {

    public static IDetailedExportBuilder create(Trait trait) throws Exception {
        return switch (trait.getFeature().getInheritanceType().getId()) {
            case InheritanceType.EnumSyntaxon -> new TraitDetailsExportCsvBuilder();
            default -> new TraitDetailsExportExcelBuilder();
        };
    }
}

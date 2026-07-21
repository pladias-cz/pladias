package service.trait.export;

import models.traits.InheritanceType;
import models.traits.Trait;

class TraitExportRules {

    public static boolean isExportable(Trait trait) {
        return switch (trait.getFeature().getInheritanceType().getId()) {
            case InheritanceType.EnumSyntaxon, InheritanceType.Month, InheritanceType.Bool, InheritanceType.Numeric,
                 InheritanceType.Basic, InheritanceType.IntervalDeep, InheritanceType.IntervalShallow,
                 InheritanceType.EnumAdditive, InheritanceType.EnumSingle, InheritanceType.EnumStandard,
                 InheritanceType.Distribution -> true;
            default -> false;
        };
    }

}

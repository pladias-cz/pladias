package service.trait.export;

import models.traits.InheritanceType;
import models.traits.Trait;

class TraitExportRules {

    public static boolean isExportable(Trait trait) {
        switch (trait.getFeature().getInheritanceType().getId()) {
            case InheritanceType.EnumSyntaxon:
            case InheritanceType.Month:
            case InheritanceType.Bool:
            case InheritanceType.Numeric:
            case InheritanceType.Basic:
            case InheritanceType.IntervalDeep:
            case InheritanceType.IntervalShallow:
            case InheritanceType.EnumAdditive:
            case InheritanceType.EnumSingle:
            case InheritanceType.EnumStandard:
            case InheritanceType.Distribution:
                return true;

            default:
                return false;
        }
    }

}

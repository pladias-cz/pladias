package service.trait.detailexport;

import exceptions.NotSupportedException;
import models.Syntaxon;
import models.traits.Datatype;
import models.traits.InheritanceType;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import play.i18n.Messages;
import service.trait.detailexport.accumulators.*;
import settings.user.UserOptions;

import java.util.List;
import java.util.Set;

public class TraitAccumulatorFactory {

    public static final BaseExportAccumulator create(
        Trait t, UserOptions userOptions, Set<TraitDetailsEntryType> exportTypes,
        Messages messages) throws NotSupportedException {
        switch (t.getFeature().getDatatype().getId()) {
            case Datatype.IntegerDatatypeId:
                return new IntExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.BooleanDatatypeId:
                return new BoolExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.EnumNominalDatatypeId:
            case Datatype.EnumOrdinalDatatypeId:
                return resolveEnumTypeBasedOnInheritance(t, userOptions, exportTypes, messages);

            case Datatype.EnumOrdinalSingleDatatypeId:
                return new EnumOrdinalExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.EnumSyntaxonsDatatypeId:
                List<Syntaxon> syntaxons = Syntaxon.find().query().where().eq("rank", t.getFeature().getSyntaxonRestrictedRankId()).orderBy("foreignId").findList();
                return new SyntaxonExportAccumulator(t, userOptions, exportTypes, syntaxons, messages);

            case Datatype.IntervalAvgDatatypeId:
                return new AvgExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.MonthDatatypeId:
                return new MonthExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.YearDatatypeId:
                return new YearExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.RealDatatypeId:
                return new RealExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.RealMultiDatatypeId:
                return new RealMultiExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.PercentageDatatypeId:
                return new PercentageExportAccumulator(t, userOptions, exportTypes, messages);

            case Datatype.DistributionDatatypeId:
                return new DistributionExportAccumulator(t, userOptions, exportTypes, messages);
            default:
                throw new NotSupportedException("Trait inheritance type not supported");
        }
    }

    private static BaseExportAccumulator resolveEnumTypeBasedOnInheritance(
        Trait trait,
        UserOptions userOptions,
        Set<TraitDetailsEntryType> exportTypes,
        Messages messages) {
        InheritanceType inheritanceType = trait.getFeature().getInheritanceType();
        if (inheritanceType.getId() == InheritanceType.Basic) {
            return new EnumOrdinalExportAccumulator(trait, userOptions, exportTypes, messages);
        }
        return new EnumExportAccumulator(trait, userOptions, exportTypes, messages);
    }
}

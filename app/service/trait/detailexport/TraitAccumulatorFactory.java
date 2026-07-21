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
        return switch (t.getFeature().getDatatype().getId()) {
            case Datatype.IntegerDatatypeId -> new IntExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.BooleanDatatypeId -> new BoolExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.EnumNominalDatatypeId, Datatype.EnumOrdinalDatatypeId ->
                resolveEnumTypeBasedOnInheritance(t, userOptions, exportTypes, messages);
            case Datatype.EnumOrdinalSingleDatatypeId ->
                new EnumOrdinalExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.EnumSyntaxonsDatatypeId -> {
                List<Syntaxon> syntaxons = Syntaxon.find().query().where().eq("rank", t.getFeature().getSyntaxonRestrictedRankId()).orderBy("foreignId").findList();
                yield new SyntaxonExportAccumulator(t, userOptions, exportTypes, syntaxons, messages);
            }
            case Datatype.IntervalAvgDatatypeId -> new AvgExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.MonthDatatypeId -> new MonthExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.YearDatatypeId -> new YearExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.RealDatatypeId -> new RealExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.RealMultiDatatypeId -> new RealMultiExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.PercentageDatatypeId ->
                new PercentageExportAccumulator(t, userOptions, exportTypes, messages);
            case Datatype.DistributionDatatypeId ->
                new DistributionExportAccumulator(t, userOptions, exportTypes, messages);
            default -> throw new NotSupportedException("Trait inheritance type not supported");
        };
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

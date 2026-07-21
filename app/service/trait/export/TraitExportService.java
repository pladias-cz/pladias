package service.trait.export;

import exceptions.NotSupportedException;
import io.ebean.Model;
import models.Taxon;
import models.User;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import org.apache.commons.lang3.time.StopWatch;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import service.trait.detailexport.DetailedExportBuilderFactory;
import service.trait.detailexport.IDetailedExportBuilder;
import service.trait.detailexport.SimpleExportDataTransformer;
import service.trait.detailexport.TraitAccumulatorFactory;
import service.trait.detailexport.accumulators.BaseExportAccumulator;
import service.trait.excel.TraitDataProviderFactory;
import settings.user.UserOptions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

public class TraitExportService {
    private final Messages messages;
    private final Set<TraitDetailsEntryType> exportTypes;
    private final User currentUser;
    private final Trait trait;

    private final Logger logger = LoggerFactory.getLogger(TraitExportService.class);

    public TraitExportService(Messages messages, User currentUser, Trait trait) throws Exception {
        this.messages = messages;
        this.currentUser = currentUser;
        this.trait = trait;
        this.exportTypes = initExportTypesSet();
    }

    private Set<TraitDetailsEntryType> initExportTypesSet() {
        Set<TraitDetailsEntryType> set = new HashSet<>();
        set.add(TraitDetailsEntryType.Original);
        set.add(TraitDetailsEntryType.Inherited);
        set.add(TraitDetailsEntryType.Aggregated);
        return set;
    }

    public TraitExportResponse buildDetailedExport() throws Exception {
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();
        logger.info("Stopwatch started");
        IDetailedExportBuilder exportBuilder = DetailedExportBuilderFactory.create(trait);
        TraitDataProviderFactory entitiesProviderService = new TraitDataProviderFactory(trait.getFeature().getDatatype());

        if (!TraitExportRules.isExportable(trait)) {
            logger.info(String.format("Trait %s not exportable", trait.getDescriptionEn()));
            return new TraitExportResponse(new byte[0], "");
        }

        List<? extends Model> entities = entitiesProviderService.getAllData(trait);
        logger.info(String.format("Exporting trait %s", trait.getDescriptionEn()));

        BaseExportAccumulator accumulator = populateAccumulator(entities, trait);
        logger.info(String.format("Populated records at accumulator. Time: %d secs", stopWatch.getTime(TimeUnit.SECONDS)));

        return new TraitExportResponse(
            convertAccumulatorToBytes(accumulator, exportBuilder),
            String.format("TraitExport%d.%s", trait.getId(), exportBuilder.getExtension()));
    }

    private byte[] convertAccumulatorToBytes(BaseExportAccumulator accumulator,
                                             IDetailedExportBuilder exportBuilder) throws Exception {
        SimpleExportDataTransformer dataTransformer = new SimpleExportDataTransformer(trait, accumulator);
        return exportBuilder.build(dataTransformer);
    }

    private BaseExportAccumulator populateAccumulator(List<? extends Model> entities, Trait trait) throws NotSupportedException {
        UserOptions userOptions = new UserOptions(currentUser);
        BaseExportAccumulator accumulator = TraitAccumulatorFactory.create(trait, userOptions, exportTypes, messages);

        //for the time being we export all taxons:
        List<Long> selectedTaxonIds = Taxon.find().query().findIds();
        accumulator.registerTaxons(selectedTaxonIds);
        for (Model model : entities) {
            accumulator.populateRecordFields(model);
        }
        return accumulator;
    }
}

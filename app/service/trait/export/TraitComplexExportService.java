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
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.ComplexExportDataTransformer;
import service.trait.detailexport.IDetailedExportBuilder;
import service.trait.detailexport.TraitAccumulatorFactory;
import service.trait.detailexport.accumulators.BaseExportAccumulator;
import service.trait.detailexport.csv.TraitDetailsExportCsvBuilder;
import settings.user.UserOptions;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;

public class TraitComplexExportService {
    private final Logger logger = LoggerFactory.getLogger(TraitComplexExportService.class);
    private final Messages messages;
    private final IDetailedExportBuilder exportBuilder;

    public TraitComplexExportService(Messages messages) throws Exception {
        this.messages = messages;
        this.exportBuilder = new TraitDetailsExportCsvBuilder();
    }

    public TraitExportResponse buildDetailedExport(User currentUser, TraitExportRequest exportRequest) throws Exception {
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();

        List<Taxon> taxons = Taxon.find().query()
            .where()
            .idIn(exportRequest.taxonIdList)
            .in("rank.id", exportRequest.rankIds)
            .orderBy("name_lat")
            .findList();

        ComplexExportDataTransformer complexExportTransfomer = new ComplexExportDataTransformer(taxons);
        logger.info("Stopwatch started");
        for (Trait trait : exportRequest.traitList) {
            if (!TraitExportRules.isExportable(trait)) {
                logger.info(String.format("Trait %s will not be exported", trait.getDescriptionEn()));
                continue;
            }

            TraitsExportEntitiesProviderService entitiesProviderService = new TraitsExportEntitiesProviderService(trait);
            List<? extends Model> entities = entitiesProviderService.collectEntities(
                exportRequest.taxonIdList,
                new TraitDetailsEntryType[]{
                    TraitDetailsEntryType.Original,
                    TraitDetailsEntryType.Aggregated,
                    TraitDetailsEntryType.Inherited,
                    TraitDetailsEntryType.Composite});
            logger.info(String.format("Exporting trait %d", trait.getId()));

            BaseExportAccumulator accumulator = populateAccumulator(
                currentUser, entities, trait, exportRequest.entryTypes);
            logger.info(String.format("Populated records at accumulator. Time: %d secs", stopWatch.getTime(TimeUnit.SECONDS)));

            populateComplexExportTransformer(accumulator, complexExportTransfomer);
        }
        return new TraitExportResponse(
            exportToBytes(complexExportTransfomer),
            "complexExport.csv");
    }

    private byte[] exportToBytes(ComplexExportDataTransformer dataTransformer) throws IOException {
        TraitDetailsExportCsvBuilder csvBuilder = new TraitDetailsExportCsvBuilder();
        return csvBuilder.build(dataTransformer);
    }

    private void populateComplexExportTransformer(BaseExportAccumulator accumulator, ComplexExportDataTransformer complexExportTransformer) {
        List<List<CellDetail>> headerDetails = accumulator.getColumnHeaderData(true);
        complexExportTransformer.recordHeaders(headerDetails);

        Map<Long, List<CellDetail>> data = accumulator.getRawData();
        for (long taxonId : data.keySet()) {
            complexExportTransformer.recordData(taxonId, data.get(taxonId));
        }
    }

    private BaseExportAccumulator populateAccumulator(
        User currentUser, List<? extends Model> entities, Trait trait, Set<TraitDetailsEntryType> exportTypes) throws NotSupportedException {
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

    public String getExportFileExtension() {
        return exportBuilder.getExtension();
    }

}

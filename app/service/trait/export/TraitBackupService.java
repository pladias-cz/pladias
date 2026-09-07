package service.trait.export;

import db.DbTableCsvSerializer;
import dto.TraitExportSnapshotDto;
import models.User;
import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;
import models.traitsExport.TraitExportSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.db.Database;
import play.i18n.Messages;
import play.mvc.Http.Session;
import scheduler.SingleThreadedExecutor;
import service.trait.comparator.TraitComparator;
import taxons.config.TaxonConfiguration;
import utils.SessionUtils;
import utils.TaxonRanksUtils;
import zip.Zipper;

import javax.inject.Inject;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Backups of the whole measurement data - a zip of dummy distribution tables and a complex trait export.
 * Snapshots are stored in the database and built asynchronously because of the amount of data.
 */
public class TraitBackupService {

    private static final String DummyDistributionLeftTable = "public_web.dummy_distribution_left";
    private static final String DummyDistributionRightTable = "public_web.dummy_distribution_right";
    private static final String DummyDistributionLeftTableCsv = "dummy_distribution_left.csv";
    private static final String DummyDistributionRightTableCsv = "dummy_distribution_right.csv";

    private final Logger logger = LoggerFactory.getLogger(TraitBackupService.class);

    @Inject
    private Database db;

    @Inject
    private TaxonConfiguration taxonConfiguration;

    @Inject
    private SingleThreadedExecutor singleThreadedExecutor;

    public List<TraitExportSnapshotDto> getSnapshots() {
        return TraitExportSnapshot.find().query()
            .orderBy("datetime DESC")
            .findList()
            .stream()
            .map(t -> new TraitExportSnapshotDto(
                t.getId(),
                t.getDescription(),
                t.getDatetime()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());
    }

    /**
     * @return stored snapshot or null when there is no such snapshot
     */
    public TraitExportSnapshot getSnapshot(int snapshotId) {
        return TraitExportSnapshot.find().byId(snapshotId);
    }

    /**
     * Registers the backup to be built in background.
     *
     * @throws Exception when the backup cannot be registered
     */
    public void scheduleBackup(Session session, Messages messages, String description) throws Exception {
        TraitExportRequest exportDetails = buildCompleteExportRequest();
        singleThreadedExecutor.register(() -> buildAndSaveSnapshot(session, messages, exportDetails, description));
    }

    private TraitExportRequest buildCompleteExportRequest() {
        TraitExportRequest exportDetails = new TraitExportRequest();

        exportDetails.taxonIdList = taxonConfiguration.getTaxonIds(true);

        exportDetails.traitList = Trait.find().all()
            .stream().sorted(TraitComparator.INSTANCE)
            .collect(Collectors.toList());
        exportDetails.rankIds = TaxonRanksUtils.getExportableRankIds();
        exportDetails.entryTypes = new HashSet<TraitDetailsEntryType>(
            Arrays.asList(TraitDetailsEntryType.Original,
                TraitDetailsEntryType.Inherited,
                TraitDetailsEntryType.Aggregated));

        return exportDetails;
    }

    private void buildAndSaveSnapshot(Session session, Messages messages, TraitExportRequest exportRequest, String description) {
        try (Zipper zipper = new Zipper();
             DbTableCsvSerializer dbDumper = createTableSerializer()) {
            logger.info("dumping " + DummyDistributionLeftTable);
            byte[] data = dbDumper.serialize(DummyDistributionLeftTable);
            zipper.addEntry(DummyDistributionLeftTableCsv, data);

            logger.info("dumping " + DummyDistributionRightTable);
            data = dbDumper.serialize(DummyDistributionRightTable);
            zipper.addEntry(DummyDistributionRightTableCsv, data);
            data = null;//do not need it any more

            logger.info("starting trait snapshot creation");
            User currentUser = SessionUtils.getCurrentUser(session);
            TraitExportResponse traitDetails = new TraitComplexExportService(messages)
                .buildDetailedExport(currentUser, exportRequest);
            zipper.addEntry(traitDetails.getFilename(), traitDetails.getBytes());
            traitDetails = null;
            zipper.close();

            TraitExportSnapshot snapshot = new TraitExportSnapshot();
            snapshot.setData(zipper.getBytes());
            snapshot.setFilename("complexExport.zip");
            snapshot.setDescription(description);
            snapshot.save();
            logger.info("trait snapshot created");
            System.gc();//this was memory heavy operation

        } catch (Exception e) {
            logger.error("trait snapshot creation failed", e);
        }
    }

    private DbTableCsvSerializer createTableSerializer() throws SQLException {
        return new DbTableCsvSerializer(db.getConnection());
    }
}

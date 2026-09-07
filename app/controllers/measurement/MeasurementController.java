package controllers.measurement;

import controllers.ControllerBase;
import controllers.security.Authorized;
import db.DbTableCsvSerializer;
import dto.*;
import models.User;
import models.traits.*;
import models.traitsExport.TraitDetailsEntryType;
import models.traitsExport.TraitExportSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.db.Database;
import play.i18n.Messages;
import play.mvc.*;
import play.mvc.Http.Session;
import play.mvc.Security;
import scheduler.SingleThreadedExecutor;
import service.accessrights.AccessRights;
import service.accessrights.IAccessRightsService;
import service.trait.comparator.TraitComparator;
import service.trait.export.TraitComplexExportService;
import service.trait.export.TraitExportRequest;
import service.trait.export.TraitExportResponse;
import taxons.config.TaxonConfiguration;
import utils.JsonResult;
import utils.SessionUtils;
import utils.TaxonRanksUtils;
import zip.Zipper;

import javax.inject.Inject;
import java.sql.SQLException;
import java.util.*;
import java.util.stream.Collectors;

@Security.Authenticated(Authorized.class)
public class MeasurementController extends TraitBaseController {

    private static final String DummyDistributionLeftTable = "public_web.dummy_distribution_left";
    private static final String DummyDistributionRightTable = "public_web.dummy_distribution_right";
    private static final String DummyDistributionLeftTableCsv = "dummy_distribution_left.csv";
    private static final String DummyDistributionRightTableCsv = "dummy_distribution_right.csv";
    private final Logger logger = LoggerFactory.getLogger(MeasurementController.class);
    @Inject
    private IAccessRightsService accessRightsService;
    @Inject
    private Database db;
    @Inject
    private FormFactory formFactory;
    @Inject
    private TaxonConfiguration taxonConfiguration;
    @Inject
    private SingleThreadedExecutor singleThreadedExecutor;

    protected TraitExportResponse buildComplexExport(Session session, TraitExportRequest exportDetails) throws Exception {
        Messages messages = getMessages(session);
        User currentUser = SessionUtils.getCurrentUser(session);

        TraitComplexExportService exportService =
            new TraitComplexExportService(messages);
        return exportService.buildDetailedExport(currentUser, exportDetails);
    }

    public Result getAggregationTypes() {
        List<TraitAggregationTypeDto> dtos = InheritanceType.find().query()
            .orderBy("key")
            .findList()
            .stream()
            .map(t -> new TraitAggregationTypeDto(
                t.getId(),
                t.getKey(),
                t.getDescription()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }


    public Result getDatatypes() {
        List<TraitDatatypeDto> dtos = Datatype.find().query()
            .orderBy("key")
            .findList()
            .stream()
            .map(t -> new TraitDatatypeDto(
                t.getId(),
                t.getKey(),
                t.getNameCz(),
                t.getDescriptionCz(),
                t.getMultiplicity(),
                t.isDominantValue(),
                t.getFrequency(),
                t.isCommentable(),
                t.isUnmeasurable()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getVisibilityStatus() {
        List<VisibilityStatus> dtos = VisibilityStatus.find().query()
            .orderBy("id")
            .findList();

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getFeatureGroups() {
        List<MeasurementFeatureGroupDto> dtos = Section.find().query()
            .where()
            .eq("depth", 1)
            .orderBy("lft")
            .findList()
            .stream()
            .map(t -> new MeasurementFeatureGroupDto(
                t.getId(),
                t.getNameCz()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getTraitExportSnapshots() {
        List<TraitExportSnapshotDto> dtos = TraitExportSnapshot.find().query()
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

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result downloadSnapshot(Http.Request request, int snapshotId) {
        Messages messages = getMessages(request);
        if (!accessRightsService.IsActionAllowed(request.session(), AccessRights.TraitBackup)) {
            return badRequest(messages.at("TraitsController.UserNotElligible"));
        }

        TraitExportSnapshot snapshot = TraitExportSnapshot.find().byId(snapshotId);
        if (snapshot == null) {
            return notFound("trait export not found");
        }

        return toResult(snapshot.toExportResponse());
    }

    public Result getTraitsOfFeature(Http.Request request, Integer id) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        List<MeasurementTraitDto> dtos = Trait.find().query()
            .where()
            .eq("feature.id", id)
            .eq("deleted", false)
            .orderBy("id")
            .findList()
            .stream()
            .map(t -> new MeasurementTraitDto(
                t.getId(),
                t.getCreateTimestamp().toInstant().toString(),
                t.getTotalTaxonCount(),
                t.getSource(),
                t.getDescriptionCz(),
                t.getOwner().getFullname(),
                t.getVisibilityStatus().getDescriptionCz(),
                t.hasAttachment(),
                t.isDefault(),
                currentUser.isTraitAdmin() || !t.getVisibilityStatus().isAdmin(),
                currentUser.supervises(t.getFeature()),
                currentUser.isAnalyst()

            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getFeaturesOfGroup(Integer id) {
        List<MeasurementFeatureDto> dtos = Feature.find().query()
            .fetch("section")
            .where()
            .eq("section.id", id)
            .orderBy("succession")
            .findList()
            .stream()
            .map(t -> new MeasurementFeatureDto(
                t.getId(),
                t.getNameCz(),
                t.getAdmin().getFullname(),
                t.getAdmin().getEmail(),
                t.getExplanationCz(),
                t.getBibliographyCz(),
                t.getDatatype().getId(),
                t.getInheritanceType().getId(),
                t.getEnumerate() != null
                    ? t.getEnumerate().getId()
                    : null,
                t.getMinimum(),
                t.getMaximum(),
                t.getUnit() != null
                    ? t.getUnit().getNameCz()
                    : null,
                t.getSection() != null
                    ? t.getSection().getNameCz()
                    : ""
            ))
            .toList();

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getFeature(Integer id) {
        Feature t = Feature.find().byId(id);
        if (t == null) {
            return badRequest(JsonResult.error("No feature"));
        }

        MeasurementFeatureDto dto = new MeasurementFeatureDto(
            t.getId(),
            t.getNameCz(),
            t.getAdmin().getFullname(),
            t.getAdmin().getEmail(),
            t.getExplanationCz(),
            t.getBibliographyCz(),
            t.getDatatype().getId(),
            t.getInheritanceType().getId(),
            t.getEnumerate() != null
                ? t.getEnumerate().getId()
                : null,
            t.getMinimum(),
            t.getMaximum(),
            t.getUnit() != null
                ? t.getUnit().getNameCz()
                : null,
            t.getSection() != null
                ? t.getSection().getNameCz()
                : null
        );

        return ok(JsonResult.buildSuccess(dto));

    }


    public Result getEnumerateValues(Integer id) {
        List<EnumerateValueDto> dtos = EnumerateValue.find().query()
            .where()
            .eq("enumerate_id", id)
            .orderBy("succession")
            .findList()
            .stream()
            .map(t -> new EnumerateValueDto(
                t.getId(),
                t.getNameCz(),
                t.getDescriptionCz()

            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

    public Result getTraitDetailsEntryType() {
        List<Map<String, Object>> values = Arrays.stream(TraitDetailsEntryType.values())
            .map(t -> {
                Map<String, Object> m = new HashMap<>();
                m.put("name", t.name());
                m.put("index", t.getIndex());
                return m;
            })
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(values));
    }

    public Result backupResult(Http.Request request) {
        Session session = request.session();
        Messages messages = getMessages(request);

        if (!accessRightsService.IsActionAllowed(request.session(), AccessRights.TraitBackup)) {
            return badRequest(messages.at("TraitsController.UserNotElligible"));
        }

        Form<TraitBackupReq> form = formFactory.form(TraitBackupReq.class).bindFromRequest(request);
        if (form.hasErrors()) {
            return badRequest("Invalid input");
        }

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

        try {
            singleThreadedExecutor.register(() ->
                buildAndSaveSnapshot(session, exportDetails, form.get().description)
            );
        } catch (Exception e) {
            return internalServerError(e.getMessage());
        }
        return ok(messages.at("TraitExportController.traitBackupInProgress"));
    }

    private void buildAndSaveSnapshot(Session session, TraitExportRequest exportRequest, String description) {
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
            TraitExportResponse traitDetails = buildComplexExport(session, exportRequest);
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

    public static class TraitBackupReq {
        private String description;

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }
}

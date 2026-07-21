package controllers.atlas;

import cache.TaxonCache;
import controllers.ControllerBase;
import controllers.security.Authorized;
import models.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Http.Session;
import play.mvc.Result;
import play.mvc.Security;
import service.config.IConfigService;
import service.csv.CsvMapService;
import service.revisors.IRevisorService;
import service.taxon.SimpleMapRecordSelectionFilter;
import utils.JsonResult;
import utils.SessionUtils;

import javax.inject.Inject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

// TODO - should be really for all users available?

@Security.Authenticated(Authorized.class)
public class MapReportsController extends ControllerBase {

    final Logger logger = LoggerFactory.getLogger(MapReportsController.class);

    @Inject
    private FormFactory formFactory;

    @Inject
    private IRevisorService revisorService;

    @Inject
    private IConfigService configService;


    public Result downloadCsvMapDetails(Integer id) {
        CsvMapDetails csvDetails = CsvMapDetails.find().byId(id);
        if (csvDetails != null) {
            String filename = String.format("attachment; filename=%s", csvDetails.getFilename());
            return ok(csvDetails.getCsvDataInputStream())
                .withHeader("Content-disposition", filename)
                .as("application/x-download");
        }
        return ok("error");
    }

    public Result downloadZipArchive(String preslia) throws Exception {
        try {
            List<TaxonMapSettings> settings = TaxonMapSettings.find().query().where().eq("preslia", preslia).findList();
            String baseArchiveName = String.format("Preslia_%d_archive", preslia);
            return doDownloadZipArchive(settings, baseArchiveName);
        } catch (Exception e) {
            logger.error(e.getMessage());
            throw e;
        }
    }

    public Result downloadSelected(Http.Request request) throws Exception {
        Form<SelectedTaxons> selectedTaxonsForm = formFactory.form(SelectedTaxons.class).bindFromRequest(request);
        if (selectedTaxonsForm.hasErrors()) {
            return badRequest();
        }

        try {
            List<Integer> taxonList = buildTaxonIdList(selectedTaxonsForm.get().taxonIds);
            List<TaxonMapSettings> settings = TaxonMapSettings.find().query().where().in("id", taxonList).findList();
            return doDownloadZipArchive(settings, "zipArchive");
        } catch (Exception e) {
            logger.error(e.getMessage());
            throw e;
        }
    }

    private List<Integer> buildTaxonIdList(String[] traitIds) {
        return Arrays.asList(traitIds).stream().mapToInt(Integer::parseInt).boxed().collect(Collectors.toList());
    }

    private Result doDownloadZipArchive(List<TaxonMapSettings> settings, String zipArchiveBaseName) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ZipOutputStream zos = new ZipOutputStream(bos);

        for (TaxonMapSettings setting : settings) {
            Taxon taxon = Taxon.find().byId(setting.getId());
            logger.info(String.format("Zip archive: processing taxon %s", taxon.getNameLat()));


            CsvMapDetails csvDetails = taxon.getCsvMapDetail();
            if (csvDetails != null) {
                zos.putNextEntry(new ZipEntry(csvDetails.getFilename()));
                byte[] data = csvDetails.getCsvData();
                zos.write(data, 0, data.length);
                logger.info("Zip archive: included Csv details");

                zos.putNextEntry(new ZipEntry(csvDetails.getFilename().replace(".csv", "_render.csv")));
                data = csvDetails.getCsvDataMapRender();
                zos.write(data, 0, data.length);
                logger.info("Zip archive: included Csv render details");
            }

            zos.putNextEntry(new ZipEntry(taxon.getNameLat().replace(' ', '_') + "_map.png"));
            PdfMap pdfMap = PdfMap.find(taxon.getId(), PdfMap.PngType);
            if (pdfMap != null) {
                byte[] data = pdfMap.getData();
                zos.write(data, 0, data.length);
                logger.info("Zip archive: included Png map");
            } else {
                logger.info("Png map not found");
            }

            zos.putNextEntry(new ZipEntry(taxon.getNameLat().replace(' ', '_') + "_map_appendix.pdf"));
            byte[] data = PdfMapController.buildPdfMapByteStream(taxon.getId());
            if (data != null) {
                zos.write(data, 0, data.length);
                logger.info("Zip archive: included Pdf doc");
            } else {
                logger.info("Pdf doc not found");
            }

        }

        zos.close();
        bos.close();
        byte[] outputBytes = bos.toByteArray();
        ByteArrayInputStream bis = new ByteArrayInputStream(outputBytes);
        String filename = String.format("attachment; filename=%s", zipArchiveBaseName + ".zip");
        return ok(bis)
            .withHeader("Content-disposition", filename)
            .as("application/x-download");
    }

    public Result downloadCsvRenderMapDetails(Integer id) {
        CsvMapDetails csvDetails = CsvMapDetails.find().byId(id);
        if (csvDetails != null) {
            String filename = String.format("attachment; filename=%s", "map_render_" + csvDetails.getFilename());
            return ok(csvDetails.getCsvDataMapRenderInputStream())
                .withHeader("Content-disposition", filename)
                .as("application/x-download");
        }
        return ok("error");
    }

    public Result buildAndDownloadCsvRenderMapDetails(long taxonId, int commonThreshold, int mapType) {
        try {
            CsvMapService mapService = new CsvMapService();
            MapType mapTypeValue = MapType.findById(mapType);

            SimpleMapRecordSelectionFilter filter
                = new SimpleMapRecordSelectionFilter(commonThreshold, taxonId, mapTypeValue);

            byte[] data = mapService.buildQuadrantSpecimenCsvData(filter);
            Taxon taxon = Taxon.find().byId(taxonId);

            String targetFilename = "map_render_"
                + taxon.getNameLat().replace(' ', '_')
                + "_map_data.csv";
            String contents = String.format("attachment; filename=%s", targetFilename);
            return ok(data)
                .withHeader("Content-disposition", contents)
                .as("application/x-download");
        } catch (Exception e) {
            return ok("Error!");
        }
    }

    //POST
    public Result assignUserTaxon(Http.Request request) {
        Messages messages = getMessages(request);
        if (!isCurrentUserEligible(request.session())) {
            return badRequest(Json.toJson(Map.of("error", messages.at("MapReport.unpossibel"))));
        }

        Form<UserTaxon> userTaxonForm = formFactory.form(UserTaxon.class).bindFromRequest(request);
        if (userTaxonForm.hasErrors()) {
            return badRequest(Json.toJson(Map.of("error", messages.at("MapReport.errors"))));
        }

        Taxon taxon = Taxon.find().byId(userTaxonForm.get().taxon);
        User user = User.find().byId(userTaxonForm.get().user);
        User currentUser = SessionUtils.getCurrentUser(request.session());

        if (taxon == null || user == null) {
            return badRequest(Json.toJson(Map.of("error", messages.at("MapReport.errors"))));
        }

        try {
            revisorService.assignRevisorsToTaxon(currentUser, new User[]{user}, taxon, messages);
        } catch (Exception e) {
            logger.error("Failed to assign revisors to taxon", e);
            return badRequest(Json.toJson(Map.of("error", messages.at("MapReport.errors"))));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", messages.at("MapReport.errors"));

        return ok(JsonResult.buildSuccess(
            ""
        ));
    }

    //DELETE
    public Result removeUserTaxon(Http.Request request, long userId, long taxonId) {
        if (!isCurrentUserEligible(request.session())) {
            return badRequest(JsonResult.buildError("not allowed"));
        }

        User user = User.find().byId(userId);
        Taxon taxon = Taxon.find().byId(taxonId);
        Messages messages = getMessages(request);
        if (user == null || taxon == null) {
            return badRequest(JsonResult.buildError(messages.at("MapReports.taxonAssociationNotRemoved")));
        }

        List<Taxon> subtaxons = Taxon.find().query()
            .where()
            .ge("left", taxon.getLeft())
            .le("right", taxon.getRight())
            .findList();

        for (Taxon t : subtaxons) {
            user.getSupervisedTaxons().remove(t);
            TaxonCache.getInstance().clear(t);
        }
        user.update();

        return ok(JsonResult.buildSuccess());

    }

    private boolean isCurrentUserEligible(Session session) {
        models.User currentUser = SessionUtils.getCurrentUser(session);
        return currentUser.isMapAdmin();
    }

    public static class SelectedTaxons {
        @Required
        private String[] taxonIds;

        public String[] getTaxonIds() {
            return taxonIds;
        }

        public void setTaxonIds(String[] taxons) {
            this.taxonIds = taxons;
        }
    }

    public static class UserTaxon {
        @Required
        public Long taxon;
        @Required
        public Long user;

        public Long getTaxon() {
            return taxon;
        }

        public void setTaxon(Long taxon) {
            this.taxon = taxon;
        }

        public Long getUser() {
            return user;
        }

        public void setUser(Long user) {
            this.user = user;
        }

    }
}

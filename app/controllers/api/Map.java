package controllers.api;

import controllers.ControllerBase;
import models.*;
import play.mvc.Http;
import play.mvc.Result;
import service.accessrights.SecurityAttrs;
import service.accessrights.TokenAuthenticated;
import service.csv.CsvMapService;
import service.taxon.SimpleMapRecordSelectionFilter;

import java.time.format.DateTimeFormatter;
import java.util.Optional;

@TokenAuthenticated
public class Map extends ControllerBase {

    public Result buildAndDownloadCsvRenderMapDetails(Http.Request request, long taxonId, int commonThreshold, int mapType) {
        try {
            Optional<User> u = request.attrs().getOptional(SecurityAttrs.AUTH_USER);
            if (u.isEmpty()) {
                return unauthorized("Unauthorized");
            }
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

    public Result downloadPngMap(long taxonId) {
        PdfMap pngMap = PdfMap.find(taxonId, PdfMap.PngType);
        String filename = String.format("attachment; filename=%s", pngMap.getFilename());
        return ok(pngMap.getPdfMapInputStream())
            .withHeader("Content-disposition", filename)
            .as("image/png");
    }

    public Result downloadCsvMapDetails(long taxonId) {
        CsvMapDetails csvDetails = CsvMapDetails.find().query().where().eq("taxon_id", taxonId).findOne();

        if (csvDetails != null) {
            String creationTimestamp = DateTimeFormatter.ISO_INSTANT.format(csvDetails.getDatetime().toInstant());
            String filename = String.format("attachment; filename=%s", csvDetails.getFilename());
            return ok(csvDetails.getCsvDataInputStream())
                .withHeader("Content-disposition", filename)
                .withHeader("Creation-Timestamp", creationTimestamp)
                .as("application/x-download");
        }
        return ok("error");
    }
}

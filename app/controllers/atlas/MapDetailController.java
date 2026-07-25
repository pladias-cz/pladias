package controllers.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import db.UseReplica;
import dto.atlas.SquareValidationStatusResponse;
import models.Taxon;
import models.User;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.map.MapDetailService;
import utils.JsonResult;
import utils.SessionUtils;

@Security.Authenticated(Authorized.class)
public class MapDetailController extends ControllerBase {

    private final MapDetailService mapDetailService = new MapDetailService();

    /**
     * Get validation statuses for the 8 neighboring squares around the given square for a specific taxon.
     * This is a React API endpoint that returns JSON data with direction information for navigation
     * and current square centroid for map centering.
     * @return JSON response with SquareValidationStatusResponse containing neighbors and current square info
     */
    @UseReplica
    public Result getSquareInfo(Http.Request request, int squareCode, Long taxonId) {
        Taxon taxon = Taxon.find().byId(taxonId);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }

        SquareValidationStatusResponse response = mapDetailService.getSquareValidationStatus(
            getMessages(request), taxon, squareCode);
        return ok(JsonResult.buildSuccess(response));
    }
    /**
     * Get records within 10km distance from the centroid of a given square for a specific taxon and project.
     * Delegates to specific project type methods.
     * This endpoint returns MINIMAL data suitable for map display.
     *
     * @param request    HTTP request
     * @param squareCode The square code (e.g., 5252)
     * @param taxonId    The taxon ID
     * @param project    Project type (gbif, inaturalist, pladias)
     * @return JSON response with list of record DTOs (minimal)
     */
    @UseReplica
    public Result getNearbyRecords(Http.Request request, String squareCode, Long taxonId, String project) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        Object result = mapDetailService.getNearbyRecords(squareCode, taxonId, project, currentUser);

        if (result instanceof MapDetailService.MapDetailResult mapResult) {
            if (mapResult.isSuccess()) {
                return ok(JsonResult.buildSuccess(mapResult.getData()));
            } else {
                return badRequest(JsonResult.error(mapResult.getError()));
            }
        }

        return badRequest(JsonResult.error("Unexpected error"));
    }

    /**
     * Get records ONLY from the given square for a specific taxon and project.
     * Delegates to specific project type methods.
     * This endpoint returns FULL data suitable for table display.
     *
     * @param request    HTTP request
     * @param squareCode The square code (e.g., 5252)
     * @param taxonId    The taxon ID
     * @param project    Project type (gbif, inaturalist, pladias)
     * @return JSON response with list of record DTOs (full)
     */
    @UseReplica
    public Result getSquareRecords(Http.Request request, String squareCode, Long taxonId, String project) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        Object result = mapDetailService.getSquareRecords(squareCode, taxonId, project, currentUser);

        if (result instanceof MapDetailService.MapDetailResult mapResult) {
            if (mapResult.isSuccess()) {
                return ok(JsonResult.buildSuccess(mapResult.getData()));
            } else {
                return badRequest(JsonResult.error(mapResult.getError()));
            }
        }

        return badRequest(JsonResult.error("Unexpected error"));
    }

    /**
     * Get a single PLADIAS record by ID with full relationship data.
     * Includes all 1:M relationships at first level and M:N relationships at second level.
     *
     * @param request  HTTP request
     * @param recordId The record ID
     * @return JSON response with RecordPladiasFullDto
     */
    @UseReplica
    public Result getRecordFull(Http.Request request, Long recordId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        Object result = mapDetailService.getRecordFull(recordId, currentUser);

        if (result instanceof MapDetailService.MapDetailResult mapResult) {
            if (mapResult.isSuccess()) {
                return ok(JsonResult.buildSuccess(mapResult.getData()));
            } else {
                if ("Record not found".equals(mapResult.getError())) {
                    return notFound(JsonResult.error(mapResult.getError()));
                }
                return badRequest(JsonResult.error(mapResult.getError()));
            }
        }

        return badRequest(JsonResult.error("Unexpected error"));
    }
}

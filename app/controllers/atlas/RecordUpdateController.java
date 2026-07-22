package controllers.atlas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.atlas.RecordMapFieldsDto;
import models.Record;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.records.RecordsService;
import utils.JsonResult;
import utils.SessionUtils;

import javax.inject.Inject;

@Security.Authenticated(Authorized.class)
public class RecordUpdateController extends ControllerBase {

    private static final Logger log = LoggerFactory.getLogger(RecordUpdateController.class);

    @Inject
    private RecordsService recordsService;

    /**
     * Edit a single field on a record (from RecordEditController).
     * Uses PATCH /atlas/record/:recordId
     */
    public Result editField(Http.Request request, Long recordId) {
        Messages messages = getMessages(request);

        JsonNode json = request.body().asJson();
        if (json == null || !json.isObject()) {
            return badRequest(JsonResult.error(messages.at("Atlas.unableToUpdateRecord")));
        }

        String key = json.has("key") ? json.get("key").asText() : null;
        String value = json.has("value") && !json.get("value").isNull() ? json.get("value").asText() : "";
        long lastEditTimestamp = json.has("lastEditTimestampNum") ? json.get("lastEditTimestampNum").asLong() : 0;

        if (key == null || key.isEmpty()) {
            return badRequest(JsonResult.error(messages.at("RecordEditController.invalidParameters")));
        }

        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (currentUser == null) {
            return unauthorized(JsonResult.error("Authentication required"));
        }

        Record record = Record.find().query().where().eq("id", recordId).findOne();
        if (record == null) {
            return notFound(JsonResult.error(messages.at("RecordEditController.invalidRecordId")));
        }

        long serverTimestamp = record.getLastEditTimestamp().getTime();
        if (lastEditTimestamp == 0 || lastEditTimestamp < serverTimestamp) {
            return status(409, JsonResult.error(messages.at("RecordEditController.newVersionRecordExists")));
        }

        if (record.isLocked()) {
            return forbidden(JsonResult.error(messages.at("RecordEditController.recordIsLocked")));
        }

        if (!record.isEditationAllowed()) {
            return forbidden(JsonResult.error(messages.at("RecordEditController.taxonIsLockedDueToMapPreviewGeneration")));
        }


        //TODO fix
//        zde se potřebuje nějak rozlišit že ten kdo to miportoval ho může dokud je šedý editovat - to jsou ty common
//        a naopak semafor atp mohou dělat jen admin + revizoři. Přijde mi že by to mělo být až v service,zatím ale nechám i tady a přes sebe
        if (!isElligibleForRecordValidation(currentUser, record)) {
            return forbidden(JsonResult.error(messages.at("Atlas.noRightsForRecordValidation")));
        }

        if (!record.isUserElligibleToEditCommonFields(currentUser)) {
            return forbidden(JsonResult.error(messages.at("RecordEditController.userNotAllowed")));
        }


        try {
            recordsService.editField(currentUser, record, key, value, messages);

            // Get the NEW timestamp after the update (record.update() was called inside editField)
            long newTimestamp = record.getLastEditTimestamp().getTime();

            ObjectNode result = Json.newObject();
            ObjectNode data = Json.newObject();
            data.put(key.toLowerCase(), value);
            data.put("lastEditTimestampNum", newTimestamp);
            result.set("data", data);
            return ok(result);
        } catch (IllegalArgumentException e) {
            return badRequest(JsonResult.error(e.getMessage()));
        } catch (Exception e) {
            return internalServerError(JsonResult.error(e.getMessage()));
        }
    }

    /**
     * GET record fields for map detail view.
     * Returns all fields that can be edited from map detail with their current values.
     * Used to refresh the UI after cascading changes.
     * 
     * GET /api/react/atlas/record/:recordId/mapFields
     */
    public Result getMapFields(Http.Request request, Long recordId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (currentUser == null) {
            return unauthorized(JsonResult.error("Authentication required"));
        }

        RecordMapFieldsDto fields = recordsService.getMapFields(recordId, currentUser);
        if (fields == null) {
            return notFound(JsonResult.error("Record not found"));
        }

        ObjectNode result = Json.newObject();
        result.put("id", fields.id());
        result.put("validationStatusId", fields.validationStatusId());
        result.put("originalityStatusId", fields.originalityStatusId());
        result.put("herbariumQuality", fields.herbariumQuality());
        result.put("includedInMap", fields.includedInMap());
        result.put("lastEditTimestampNum", fields.lastEditTimestampNum());
        result.put("canEdit", fields.canEdit());

        return ok(result);
    }

    /**
     * REST API: Move record to new location.
     * Body: { "recordId": number, "latitude": number, "longitude": number, "gpsPrecision": number, "timestamp": number }
     */
    public Result moveRecordCoords(Http.Request request) {
        Messages messages = getMessages(request);

        JsonNode json = request.body().asJson();
        if (json == null || !json.isObject()) {
            return badRequest(JsonResult.error(messages.at("RecordEditController.invalidParameters")));
        }

        Long recordId = json.has("recordId") ? json.get("recordId").asLong() : null;
        Double latitude = json.has("latitude") ? json.get("latitude").asDouble() : null;
        Double longitude = json.has("longitude") ? json.get("longitude").asDouble() : null;
        Integer gpsPrecision = json.has("gpsPrecision") ? json.get("gpsPrecision").asInt() : null;
        Long lastEditTimestamp = json.has("lastEditTimestampNum") ? json.get("lastEditTimestampNum").asLong() : null;

        if (recordId == null || latitude == null || longitude == null || gpsPrecision == null) {
            return badRequest(JsonResult.error(messages.at("RecordEditController.invalidParameters")));
        }

        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (currentUser == null) {
            return unauthorized(JsonResult.error("Authentication required"));
        }

        Record record = Record.find().byId(recordId);
        if (record == null) {
            return ok(JsonResult.error(messages.at("RecordEditController.invalidRecordId")));
        }

        long serverTimestamp = record.getLastEditTimestamp().getTime();

        if (lastEditTimestamp == 0 || lastEditTimestamp < serverTimestamp) {
            return status(409, JsonResult.error(messages.at("RecordEditController.newVersionRecordExists")));
        }


        if (!record.isUserElligibleToEditCommonFields(currentUser)) {
            return ok(JsonResult.error(messages.at("RecordEditController.userNotAllowed")));
        }

        if (!record.isEditationAllowed()) {
            return ok(JsonResult.error(messages.at("RecordEditController.taxonIsLockedDueToMapPreviewGeneration")));
        }

        var result = recordsService.moveRecordCoords(record, currentUser, latitude, longitude, gpsPrecision, lastEditTimestamp, messages);
        if (result.hasError()) {
            return ok(JsonResult.error(result.errorMessage()));
        }

        ObjectNode jsonResult = Json.newObject();
        jsonResult.put("success", true);
        jsonResult.put("coordsSource", result.coordsSource());
        jsonResult.put("recordId", result.recordId());
        jsonResult.put("phytochorionComputed", result.phytochorionComputed());
        jsonResult.put("lastEditTimestampNum", result.timestamp());
        return ok(jsonResult).withHeader(CONTENT_LANGUAGE, "cs");
    }

    private boolean isElligibleForRecordValidation(User user, Record record) {
        return user.isMapAdmin() || isSupervised(record.getTaxon(), user);
    }

    private boolean isSupervised(models.Taxon t, User user) {
        if (t == null || user == null) return false;
        return user.getSupervisedTaxons().contains(t);
    }
}

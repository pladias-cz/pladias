package controllers.common;

import com.fasterxml.jackson.databind.JsonNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import controllers.security.AuthorizedAsSysAdmin;
import dto.MaintenanceDto;
import models.Maintenance;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Administration of Maintenance (heartbeat) messages – table public.maintenance.
 * Editing of existing rows is intentionally not supported; the message is
 * replaced by deleting the old row and creating a new one.
 * <p>
 * Note: the heartbeat (GET /api/react/infoGlobal) and the login page display
 * only the first row (views.utils.MaintenanceMessageUtils.getMessage) – the
 * first item of {@link #getAll} is the message currently displayed.
 */
@Security.Authenticated(Authorized.class)
public class MaintenanceController extends ControllerBase {

    /** Types understood by the frontend toast store and Bootstrap alerts (login page). */
    private static final Set<String> VALID_TYPES = Set.of("success", "danger", "warning", "info");

    /** Length limit of the message column (varchar(255)). */
    private static final int MAX_TEXT_LENGTH = 255;

    /**
     * Get all Maintenance messages (sysAdmin only).
     * GET /api/react/maintenance/all
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result getAll(Http.Request request) {
        List<MaintenanceDto> dtos = Maintenance.find().all().stream()
            .map(m -> new MaintenanceDto(m.getId(), m.getType(), m.getText()))
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }

    /**
     * Create a new Maintenance message (sysAdmin only).
     * POST /api/react/maintenance
     * <p>
     * Body: {"type": "warning", "text": "..."}
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result create(Http.Request request) {
        JsonNode body = request.body().asJson();
        if (body == null) {
            return badRequest(JsonResult.error("Missing JSON body"));
        }

        String type = body.path("type").asText(null);
        String text = body.path("text").asText(null);
        if (type == null || !VALID_TYPES.contains(type)) {
            return badRequest(JsonResult.error("Invalid type. Valid values: success, danger, warning, info"));
        }
        if (text == null) {
            text = "";
        }
        text = text.trim();
        if (text.isEmpty()) {
            return badRequest(JsonResult.error("Text must not be empty"));
        }
        if (text.length() > MAX_TEXT_LENGTH) {
            return badRequest(JsonResult.error("Text must be at most " + MAX_TEXT_LENGTH + " characters long"));
        }

        Maintenance message = new Maintenance();
        message.setType(type);
        message.setText(text);
        message.save();

        return ok(JsonResult.success("Maintenance message created"));
    }

    /**
     * Delete a Maintenance message (sysAdmin only).
     * DELETE /api/react/maintenance/:id
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result delete(Http.Request request, Integer id) {
        Maintenance message = Maintenance.find().byId(id);
        if (message == null) {
            return notFound(JsonResult.error("Maintenance message not found"));
        }

        message.delete();

        return ok(JsonResult.success("Maintenance message deleted"));
    }
}

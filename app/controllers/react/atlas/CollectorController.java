package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.selectItems.CollectorOptionDto;
import models.Author;
import models.Record;
import models.RecordAuthor;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;

import java.util.List;

@Security.Authenticated(Authorized.class)
public class CollectorController extends ControllerBase {

    public Result getNotAssigned(Http.Request request, Long recordId) {
        Messages messages = getMessages(request);
        try {
            // Check if record exists (minimal query)
            Record record = Record.find().query().select("id").where().eq("id", recordId).findOne();
            if (record == null) {
                return badRequest(messages.at("CollectorController.recordNotFound"));
            }

            // Get assigned collector IDs using a direct query (efficient)
            List<Integer> assignedCollectorIds = RecordAuthor.find().query().select("author.id").where().eq("records_id", recordId).findList().stream().map(ra -> ra.getAuthor().getId()).toList();

            // Fetch only non-assigned collectors with prefetched author relation
            List<Author> collectors = Author.find().query().where().notIn("id", assignedCollectorIds).orderBy("surname").findList();

            List<CollectorOptionDto> dtos = collectors.stream().map(CollectorOptionDto::fromAuthor).toList();

            return ok(JsonResult.buildSuccess(dtos));
        } catch (Exception e) {
            return badRequest(messages.at("CollectorController.CollectorDetailsFailed"));
        }
    }
}

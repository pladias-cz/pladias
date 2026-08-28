package controllers.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.atlas.RecordCommentDto;
import io.ebean.DB;
import io.ebean.SqlUpdate;
import models.*;
import models.Record;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;
import utils.SessionUtils;
import utils.UserUtils;

import java.util.List;
import java.util.Map;

/**
 * Controller for record comments endpoint.
 * Provides CRUD operations for record comments.
 */
@Security.Authenticated(Authorized.class)
public class RecordCommentController extends ControllerBase {

    private final service.records.RecordsCommentsService commentsService = new service.records.RecordsCommentsService();

    /**
     * GET /atlas/record/comments/:recordId
     * Get all comments for a specific record.
     */
    public Result getRecordComments(Http.Request request, Long recordId) {
        try {
            List<RecordCommentDto> comments = commentsService.getRecordComments(recordId);
            return ok(JsonResult.buildSuccess(comments));
        } catch (Exception e) {
            return ok(JsonResult.error(e.getMessage()));
        }
    }

    /**
     * POST /atlas/record/comment
     * Add a new comment to a record.
     * Body: { "recordId": number, "message": string }
     */
    public Result createComment(Http.Request request) {
        try {
            var body = request.body().asJson();
            if (body == null) {
                return badRequest(JsonResult.error("Invalid request body"));
            }

            Long recordId = body.path("recordId").asLong();
            String message = body.path("message").asText();

            if (recordId == null || message == null || message.trim().isEmpty()) {
                return badRequest(JsonResult.error("recordId and message are required"));
            }

            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null) {
                return unauthorized(JsonResult.error("Authentication required"));
            }

            Record record = Record.find().byId(recordId);
            if (record == null) {
                return notFound(JsonResult.error("Record not found"));
            }

            Map<String, Object> result = commentsService.createCommentInTransaction(request, recordId, message);

            return ok(JsonResult.buildSuccess(result));

        } catch (Exception e) {
            return ok(JsonResult.error(e.getMessage()));
        }
    }

    /**
     * PUT /atlas/record/comment/:commentId
     * Update an existing comment.
     * Body: { "message": string }
     */
    public Result updateComment(Http.Request request, Long commentId) {
        try {
            var body = request.body().asJson();
            if (body == null) {
                return badRequest(JsonResult.error("Invalid request body"));
            }

            String message = body.path("message").asText();

            if (message == null || message.trim().isEmpty()) {
                return badRequest(JsonResult.error("message is required"));
            }

            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null) {
                return unauthorized(JsonResult.error("Authentication required"));
            }

            RecordComment comment = RecordComment.find().byId(commentId);
            if (comment == null) {
                return notFound(JsonResult.error("Comment not found"));
            }

            Record record = comment.getRecord();
            if (!record.isUserElligibleToEditEverything(currentUser)) {
                return forbidden(JsonResult.error("No permission to update this comment"));
            }

            Map<String, Object> result = commentsService.updateCommentInTransaction(commentId, message, currentUser, record);

            return ok(JsonResult.buildSuccess(result));

        } catch (Exception e) {
            return ok(JsonResult.error(e.getMessage()));
        }
    }

    /**
     * DELETE /atlas/record/comment/:commentId
     * Delete (soft delete) a comment.
     */
    public Result deleteComment(Http.Request request, Long commentId) {
        try {
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null) {
                return unauthorized(JsonResult.error("Authentication required"));
            }

            RecordComment comment = RecordComment.find().byId(commentId);
            if (comment == null) {
                return notFound(JsonResult.error("Comment not found"));
            }

            Record record = comment.getRecord();

            // Permission check: author can delete their own comment, or MapAdmin
            boolean isAuthor = comment.getAuthor() != null && comment.getAuthor().getId().equals(currentUser.getId());
            boolean isMapAdmin = currentUser.isMapAdmin();

            if (!isAuthor && !isMapAdmin) {
                return forbidden(JsonResult.error("No permission to delete this comment"));
            }

            Map<String, Object> result = commentsService.deleteCommentInTransaction(commentId, currentUser, record);

            return ok(JsonResult.buildSuccess(result));

        } catch (Exception e) {
            return ok(JsonResult.error(e.getMessage()));
        }
    }

    /**
     * POST /atlas/record/comment/:commentId/resolve
     * Resolve a comment.
     */
    public Result resolveComment(Http.Request request, Long commentId) {
        try {
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null) {
                return unauthorized(JsonResult.error("Authentication required"));
            }

            RecordComment comment = RecordComment.find().byId(commentId);
            if (comment == null) {
                return notFound(JsonResult.error("Comment not found"));
            }

            if (comment.isResolved()) {
                return badRequest(JsonResult.error("Comment already resolved"));
            }

            Record record = comment.getRecord();
            if (!record.isUserElligibleToEditEverything(currentUser)) {
                return forbidden(JsonResult.error("No permission to resolve this comment"));
            }

            Map<String, Object> result = commentsService.resolveCommentInTransaction(commentId, currentUser, record);

            return ok(JsonResult.buildSuccess(result));

        } catch (Exception e) {
            return ok(JsonResult.error(e.getMessage()));
        }
    }

    public  Result deleteUserCommentAssociation(Http.Request request, Long commentId, Long boundUserId)
    {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        User linkedUser = User.find().byId(boundUserId);


        if (currentUser == null || linkedUser == null)
        {
            return notFound(JsonResult.error("User not found or not logged in"));
        }

        User masterAdmin = UserUtils.getMasterAdmin();
        if (!masterAdmin.equals(currentUser) && !currentUser.equals(linkedUser))
        {
            return unauthorized(JsonResult.error("User not authorized to delete this association"));
        }


        RecordComment comment = RecordComment.find().byId(commentId);
        if (comment == null)
        {
            return notFound(JsonResult.error("Comment not found"));
        }

        String query = String.format(
            "DELETE from atlas.users_comments WHERE users_id=%d AND comments_id=%d;",
            linkedUser.getId(), comment.getId());
        SqlUpdate update = DB.sqlUpdate(query);

        try {
            update.execute();

            RecordHistory recHistory = RecordHistory.build(
                comment.getRecord().getId(), currentUser, RecordChangeType.COMMENT,
                "marked as read", "", "", comment.getId());
            recHistory.save();

            return ok(JsonResult.buildSuccess());
        }
        catch (Exception e)
        {
            return ok(JsonResult.error(e.getMessage()));
        }
    }

}

package service.records;

import dto.atlas.RecordCommentDto;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.SqlUpdate;
import io.ebean.Transaction;
import models.*;
import models.Record;
import play.mvc.Http;
import utils.SessionUtils;
import utils.TimestampUtils;

import java.util.List;
import java.util.Map;

/**
 * Service for record comments.
 * Provides business logic for CRUD operations on record comments.
 */
public class RecordsCommentsService {

    /**
     * Get all comments for a specific record.
     *
     * @param recordId the record ID
     * @return list of RecordCommentDto
     */
    public List<RecordCommentDto> getRecordComments(Long recordId) {
        ExpressionList<RecordComment> query = RecordComment.find().query()
            .where()
            .eq("record_id", recordId);

        List<RecordComment> comments = query.findList();

        return comments.stream()
            .map(RecordCommentDto::fromRecordComment)
            .toList();
    }

    /**
     * Create a new comment on a record.
     *
     * @param request  the HTTP request
     * @param recordId the record ID from request body
     * @param message  the comment message
     * @return map with created comment data
     */
    public Map<String, Object> createComment(Http.Request request, Long recordId, String message) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        Record record = Record.find().byId(recordId);

        RecordComment comment = new RecordComment();
        comment.setRecord(record);
        comment.setAuthor(currentUser);
        comment.setMessage(message.trim());
        comment.setImported(false);
        comment.setDeleted(false);
        comment.setResolved(false);
        comment.save();

        RecordHistory recHistory = RecordHistory.build(
            recordId, currentUser, RecordChangeType.COMMENT,
            "comment added", "", message.trim(), comment.getId());
        recHistory.save();

        return Map.of(
            "id", comment.getId(),
            "message", comment.getMessage(),
            "createTimestamp", comment.getCreateTimestamp() != null ?
                comment.getCreateTimestamp().toString() : null
        );
    }

    /**
     * Update an existing comment.
     *
     * @param commentId   the comment ID
     * @param message     the new message
     * @param currentUser the current user
     * @param record      the record associated with the comment
     * @return map with updated comment data
     */
    public Map<String, Object> updateComment(Long commentId, String message, User currentUser, Record record) {
        RecordComment comment = RecordComment.find().byId(commentId);

        String oldMessage = comment.getMessage();
        comment.setMessage(message.trim());
        comment.update();

        RecordHistory recHistory = RecordHistory.build(
            record.getId(), currentUser, RecordChangeType.COMMENT,
            "comment updated", oldMessage, message.trim(), commentId);
        recHistory.save();

        return Map.of(
            "id", comment.getId(),
            "message", comment.getMessage()
        );
    }

    /**
     * Delete (soft delete) a comment.
     *
     * @param commentId   the comment ID
     * @param currentUser the current user
     * @param record      the record associated with the comment
     * @return map with deletion status
     */
    public Map<String, Object> deleteComment(Long commentId, User currentUser, Record record) {
        RecordComment comment = RecordComment.find().byId(commentId);

        String oldMessage = comment.getMessage();
        comment.setDeleted(true);
        comment.update();

        deleteAllUserCommentAssociations(comment);

        RecordHistory recHistory = RecordHistory.build(
            record.getId(), currentUser, RecordChangeType.COMMENT,
            "comment deleted", oldMessage, "", commentId);
        recHistory.save();

        return Map.of(
            "id", comment.getId(),
            "deleted", true
        );
    }

    /**
     * Resolve a comment.
     *
     * @param commentId   the comment ID
     * @param currentUser the current user
     * @param record      the record associated with the comment
     * @return map with resolution status
     */
    public Map<String, Object> resolveComment(Long commentId, User currentUser, Record record) {
        RecordComment comment = RecordComment.find().byId(commentId);

        comment.setResolved(true);
        comment.setResolvedTimestamp(TimestampUtils.getTimestamp(new java.util.Date()));
        comment.setResolvedBy(currentUser);
        comment.update();

        deleteAllUserCommentAssociations(comment);

        RecordHistory recHistory = RecordHistory.build(
            record.getId(), currentUser, RecordChangeType.COMMENT,
            "comment resolved", "",
            String.format("comment #%d resolved", commentId), commentId);
        recHistory.save();

        return Map.of(
            "id", comment.getId(),
            "resolved", true,
            "resolvedById", currentUser.getId(),
            "resolvedByName", currentUser.getFullname(),
            "resolvedTimestamp", comment.getResolvedTimestamp() != null ?
                comment.getResolvedTimestamp().toString() : null
        );
    }

    /**
     * Execute a transaction for creating a comment.
     *
     * @param request  the HTTP request
     * @param recordId the record ID
     * @param message  the comment message
     * @return map with created comment data
     */
    public Map<String, Object> createCommentInTransaction(Http.Request request, Long recordId, String message) {
        try (Transaction transaction = DB.beginTransaction()) {
            Map<String, Object> result = createComment(request, recordId, message);
            transaction.commit();
            return result;
        }
    }

    /**
     * Execute a transaction for updating a comment.
     *
     * @param commentId   the comment ID
     * @param message     the new message
     * @param currentUser the current user
     * @param record      the record associated with the comment
     * @return map with updated comment data
     */
    public Map<String, Object> updateCommentInTransaction(Long commentId, String message, User currentUser, Record record) {
        try (Transaction transaction = DB.beginTransaction()) {
            Map<String, Object> result = updateComment(commentId, message, currentUser, record);
            transaction.commit();
            return result;
        }
    }

    /**
     * Execute a transaction for deleting a comment.
     *
     * @param commentId   the comment ID
     * @param currentUser the current user
     * @param record      the record associated with the comment
     * @return map with deletion status
     */
    public Map<String, Object> deleteCommentInTransaction(Long commentId, User currentUser, Record record) {
        try (Transaction transaction = DB.beginTransaction()) {
            Map<String, Object> result = deleteComment(commentId, currentUser, record);
            transaction.commit();
            return result;
        }
    }

    /**
     * Execute a transaction for resolving a comment.
     *
     * @param commentId   the comment ID
     * @param currentUser the current user
     * @param record      the record associated with the comment
     * @return map with resolution status
     */
    public Map<String, Object> resolveCommentInTransaction(Long commentId, User currentUser, Record record) {
        try (Transaction transaction = DB.beginTransaction()) {
            Map<String, Object> result = resolveComment(commentId, currentUser, record);
            transaction.commit();
            return result;
        }
    }

    /**
     * Helper method to delete all user-comment associations
     *
     * @param comment the comment
     */
    private void deleteAllUserCommentAssociations(RecordComment comment) {
        String query = String.format("DELETE FROM atlas.users_comments WHERE comments_id=%d;", comment.getId());
        SqlUpdate update = DB.sqlUpdate(query);
        update.execute();
    }
}

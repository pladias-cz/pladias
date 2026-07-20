package dto.atlas;

import java.sql.Timestamp;

/**
 * DTO for Record Comments.
 * Contains comment fields for displaying record comments.
 */
public record RecordCommentDto(
    // Comment ID
    Long id,

    // Author information
    Long authorId,
    String authorName,

    // Comment message
    String message,

    // Timestamps
    Timestamp createTimestamp,

    // Resolution status
    Boolean resolved,

    // Resolver information (who resolved and when)
    Long resolvedById,
    String resolvedByName,
    Timestamp resolvedTimestamp,

    // Deletion flag
    Boolean deleted
) {
    /**
     * Create DTO from RecordComment model
     */
    public static RecordCommentDto fromRecordComment(models.RecordComment comment) {
        return new RecordCommentDto(
            comment.getId(),
            comment.getAuthor() != null ? comment.getAuthor().getId() : null,
            comment.getAuthor() != null ? comment.getAuthor().getFullname() : null,
            comment.getMessage(),
            comment.getCreateTimestamp(),
            comment.isResolved(),
            comment.getResolvedBy() != null ? comment.getResolvedBy().getId() : null,
            comment.getResolvedBy() != null ? comment.getResolvedBy().getFullname() : null,
            comment.getResolvedTimestamp(),
            comment.isDeleted()
        );
    }
}

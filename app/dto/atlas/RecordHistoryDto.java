package dto.atlas;

import java.lang.reflect.Field;
import java.sql.Timestamp;

/**
 * DTO for Record History entries.
 * Contains all fields from RecordHistory model for displaying record change history.
 */
public record RecordHistoryDto(
    // History entry ID
    Long id,

    // Record being modified
    Long recordId,

    // User who made the change
    Long userId,
    String userName,

    // Type of change
    String changeType,

    // Field that was changed
    String fieldDesc,

    // Old and new values
    String oldValue,
    String newValue,

    // Timestamp of the change
    Timestamp createTimestamp,

    // Related comment ID (if any)
    Long commentId
) {
    /**
     * Create DTO from RecordHistory model
     */
    public static RecordHistoryDto fromRecordHistory(models.RecordHistory history) {
        String userName = history.getUser() != null
            ? history.getUser().getFullname()
            : null;

        // Handle nullable commentId - the model has a bug where getCommentId() returns primitive long
        // but the field is Long (nullable). We access the field directly via reflection.
        Long commentIdValue = null;
        try {
            Field field = models.RecordHistory.class.getDeclaredField("commentId");
            field.setAccessible(true);
            commentIdValue = (Long) field.get(history);
        } catch (Exception e) {
            // If reflection fails, default to null
            commentIdValue = null;
        }

        return new RecordHistoryDto(
            history.getId(),
            history.getRecordId(),
            history.getUser() != null ? history.getUser().getId() : null,
            userName,
            history.getChangeType() != null ? history.getChangeType().toString() : null,
            history.getFieldDesc(),
            history.getOldValue(),
            history.getNewValue(),
            history.getCreateTimestamp(),
            commentIdValue
        );
    }
}

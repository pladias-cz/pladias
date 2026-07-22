package dto.atlas;

/**
 * DTO for record fields displayed in map detail view.
 * Used for GET /api/react/atlas/record/:recordId/mapFields
 */
public record RecordMapFieldsDto(
    // Basic identification
    Long id,
    
    // Validation status
    Integer validationStatusId,
    
    // Originality status
    Integer originalityStatusId,
    
    // Herbarium quality
    Boolean herbariumQuality,
    
    // Included in map
    Boolean includedInMap,
    
    // Timestamp for concurrency control
    Long lastEditTimestampNum,
    
    // Edit permission for current user
    Boolean canEdit
) {
}
package dto.atlas;

/**
 * DTO for one bucket of a dashboard aggregation of search results – a category
 * label (null = value not specified, e.g. record without a license or altitude)
 * and the number of matching records in it.
 */
public record DashboardBucketDto(
    String label,
    long count
) {
}
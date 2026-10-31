package dto.atlas;

/**
 * DTO for a quadrant represented in search results: quadrant id and code with
 * the centroid coordinates (WGS84) used to place a marker on the search results map.
 */
public record QuadrantAggregateDto(
    int id,
    String code,
    double lat,
    double lon,
    int recordsCount
) {
}
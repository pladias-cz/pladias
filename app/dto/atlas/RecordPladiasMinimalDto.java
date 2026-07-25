package dto.atlas;

import io.ebean.SqlRow;

/**
 * Minimal DTO for PLADIAS record information.
 * Contains only fields needed for map display (geographic context).
 * For full record details, use RecordPladiasDto or RecordPladiasFullDto.
 */
public record RecordPladiasMinimalDto(
    Long id,
    Double latitude,
    Double longitude,
    Integer gpsPrecision,
    Integer year,
    String recordedBy,
    Integer validationStatusId,
    String validationStatusColor,
    String computedSquareCode
) {
    /**
     * Create a minimal DTO from a PLADIAS record SqlRow.
     * Expects the following columns in the SqlRow:
     * - id, latitude, longitude, gps_precision, year
     * - recorded_by (concatenated authors), validation_status_id, validation_status_color
     * - computed_square_code (from JOIN with geodata.quadrants_full)
     */
    public static RecordPladiasMinimalDto fromSqlRow(SqlRow row) {
        return new RecordPladiasMinimalDto(
            row.getLong("id"),
            row.getDouble("latitude"),
            row.getDouble("longitude"),
            row.getInteger("gps_precision"),
            row.getInteger("year"),
            row.getString("recorded_by"),
            row.getInteger("validation_status_id"),
            row.getString("validation_status_color"),
            row.getString("computed_square_code")
        );
    }
}
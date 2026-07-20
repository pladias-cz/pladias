package dto.atlas;

import io.ebean.SqlRow;

/**
 * Minimal DTO for GBIF record information.
 * Contains basic fields from gbif.records table with location info.
 */
public record RecordGbifMinimalDto(
    Long id,
    Double latitude,
    Double longitude,
    Integer gpsPrecision,
    Integer year,
    String recordedBy,
    String institutionCode,
    String validationStatusColor,
    String quadrantLetter,
    String squareCode,
    String computedSquareCode
) {
    /**
     * Create a minimal DTO from a GBIF record SqlRow.
     * Expects the following columns in the SqlRow:
     * - gbif_id, latitude, longitude, coords_precision, year, recorded_by, institution_code
     * - quadrant_letter (from JOIN with geodata.quadrants_full)
     * - square_code (from JOIN with geodata.squares_full)
     * - computed_square_code (same as square_code for GBIF, computed from coordinates)
     */

    public static RecordGbifMinimalDto fromSqlRow(SqlRow row) {
        // GBIF records always have the same validation status color
        String validationStatusColor = "#C95740";

        String squareCode = row.getString("square_code");

        return new RecordGbifMinimalDto(
            row.getLong("gbif_id"),
            row.getDouble("latitude"),
            row.getDouble("longitude"),
            row.getInteger("coords_precision"),
            row.getInteger("year"),
            row.getString("recorded_by"),
            row.getString("institution_code"),
            validationStatusColor,
            row.getString("quadrant_letter"),
            squareCode,
            squareCode  // For GBIF, computedSquareCode is the same as squareCode (both computed from coordinates)
        );
    }
}

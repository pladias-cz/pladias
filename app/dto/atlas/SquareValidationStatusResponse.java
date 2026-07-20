package dto.atlas;

import java.util.List;

/**
 * Response DTO for square validation status endpoint.
 * Contains validation statuses for neighboring squares and current square information.
 */
public record SquareValidationStatusResponse(
    List<SquareValidationStatusDto> neighbors,  // Validation statuses for 8 neighboring squares
    CurrentSquareInfo currentSquare             // Information about the current square
) {
    /**
     * Create a response DTO.
     */
    public static SquareValidationStatusResponse create(
        List<SquareValidationStatusDto> neighbors, CurrentSquareInfo currentSquare) {
        return new SquareValidationStatusResponse(neighbors, currentSquare);
    }

    /**
     * DTO for validation status of a specific square in a given direction.
     */
    public record SquareValidationStatusDto(
        String direction,      // e.g., "north", "northeast", "east", etc.
        int squareCode,          // The code of the square in that direction
        String text,           // Validation status text (e.g., "Accepted", "Unprocessed")
        String color           // Validation status color (RGB hex)
    ) {
        public static SquareValidationStatusDto create(
            String direction, int squareCode, String text, String color) {
            return new SquareValidationStatusDto(direction, squareCode, text, color);
        }
    }

    /**
     * DTO for current square information.
     */
    public record CurrentSquareInfo(
        int squareCode,        // The square code
        double latitude,       // Centroid latitude (WGS84)
        double longitude,      // Centroid longitude (WGS84)
        String statusText,     // Validation status text for current square
        String statusColor     // Validation status color for current square
    ) {
        public static CurrentSquareInfo create(int squareCode, double latitude, double longitude, String statusText, String statusColor) {
            return new CurrentSquareInfo(squareCode, latitude, longitude, statusText, statusColor);
        }
    }
}

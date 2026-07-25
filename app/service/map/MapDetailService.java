package service.map;

import dto.atlas.RecordGbifMinimalDto;
import dto.atlas.RecordPladiasDto;
import dto.atlas.RecordPladiasFullDto;
import dto.atlas.RecordPladiasMinimalDto;
import dto.atlas.SquareValidationStatusResponse;
import io.ebean.DB;
import io.ebean.SqlRow;
import models.*;
import models.Record;
import play.i18n.Messages;
import utils.MapSquareUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public class MapDetailService {

    /**
     * Get validation statuses for the 8 neighboring squares around the given square for a specific taxon.
     * This is a React API endpoint that returns JSON data with direction information for navigation
     * and current square centroid for map centering.
     *
     * @param messages   Messages for localization
     * @param taxon      The taxon to check
     * @param squareCode The central square code
     * @return SquareValidationStatusResponse containing neighbors and current square info
     */
    public SquareValidationStatusResponse getSquareValidationStatus(Messages messages, Taxon taxon, int squareCode) {
        // Get neighbor validation statuses
        List<SquareValidationStatusResponse.SquareValidationStatusDto> neighbors = collectValidationStatusesForReact(messages, taxon, squareCode);

        // Get current square centroid information
        SquareValidationStatusResponse.CurrentSquareInfo currentSquareInfo = getCurrentSquareInfo(messages, taxon, squareCode);

        return SquareValidationStatusResponse.create(neighbors, currentSquareInfo);
    }

    /**
     * Get records within 10km distance from the centroid of a given square for a specific taxon and project.
     * Delegates to specific project type methods.
     * This endpoint returns MINIMAL data suitable for map display.
     *
     * @param squareCode The square code (e.g., 5252)
     * @param taxonId    The taxon ID
     * @param project    Project type (gbif, inaturalist, pladias)
     * @param currentUser The current user for permission checks
     * @return Object containing Result or error message
     */
    public Object getNearbyRecords(String squareCode, Long taxonId, String project, User currentUser) {
        ProjectType projectType = ProjectType.fromString(project);
        if (projectType == null) {
            return MapDetailResult.error("Invalid project type. Must be one of: gbif, inaturalist, pladias");
        }

        MapSquareNew square = MapSquareNew.find().query().where().eq("code", squareCode).findOne();
        if (square == null) {
            return MapDetailResult.error("Square not found");
        }

        // Delegate to specific project type method
        return switch (projectType) {
            case PLADIAS -> MapDetailResult.success(getNearbyPladiasRecords(taxonId, square, currentUser));
            case INATURALIST -> MapDetailResult.success(getNearbyGbifRecords(taxonId, square, true));
            case GBIF -> MapDetailResult.success(getNearbyGbifRecords(taxonId, square, false));
            default -> MapDetailResult.error("Unsupported project type");
        };
    }

    /**
     * Get records ONLY from the given square for a specific taxon and project.
     * Delegates to specific project type methods.
     * This endpoint returns FULL data suitable for table display.
     *
     * @param squareCode The square code (e.g., 5252)
     * @param taxonId    The taxon ID
     * @param project    Project type (gbif, inaturalist, pladias)
     * @param currentUser The current user for permission checks
     * @return Object containing Result or error message
     */
    public Object getSquareRecords(String squareCode, Long taxonId, String project, User currentUser) {
        ProjectType projectType = ProjectType.fromString(project);
        if (projectType == null) {
            return MapDetailResult.error("Invalid project type. Must be one of: gbif, inaturalist, pladias");
        }

        // Delegate to specific project type method
        return switch (projectType) {
            case PLADIAS -> MapDetailResult.success(getSquarePladiasRecords(taxonId, squareCode, currentUser));
            case INATURALIST -> MapDetailResult.success(getSquareGbifRecords(taxonId, squareCode, true));
            case GBIF -> MapDetailResult.success(getSquareGbifRecords(taxonId, squareCode, false));
            default -> MapDetailResult.error("Unsupported project type");
        };
    }

    /**
     * Get a single PLADIAS record by ID with full relationship data.
     * Includes all 1:M relationships at first level and M:N relationships at second level.
     *
     * @param recordId The record ID
     * @param currentUser The current user for permission checks
     * @return RecordPladiasFullDto or error message
     */
    public Object getRecordFull(Long recordId, User currentUser) {
        if (recordId == null) {
            return MapDetailResult.error("Record ID is required");
        }

        Record record = Record.find().byId(recordId);
        if (record == null) {
            return MapDetailResult.error("Record not found");
        }

        RecordPladiasFullDto dto = RecordPladiasFullDto.fromRecord(record, currentUser);
        return MapDetailResult.success(dto);
    }

    /**
     * Get current square information including code, centroid coordinates, and validation status.
     *
     * @param messages   Messages for localization
     * @param taxon      The taxon to check
     * @param squareCode The square code
     * @return CurrentSquareInfo with square code, centroid lat/lon, and validation status
     */
    private SquareValidationStatusResponse.CurrentSquareInfo getCurrentSquareInfo(Messages messages, Taxon taxon, int squareCode) {
        MapSquareNew square = MapSquareNew.find().query().where().eq("code", String.valueOf(squareCode)).findOne();
        if (square != null) {
            geom.Point centroid = square.getCentroid();

            // Get validation status for current square
            FieldValidationStatus status = buildValidationStatus(messages, taxon, squareCode);


            return SquareValidationStatusResponse.CurrentSquareInfo.create(
                squareCode,
                centroid.getY(),  // latitude
                centroid.getX(),  // longitude
                status.getText(),
                status.getColor()
            );
        }
        // Fallback if square not found
        return SquareValidationStatusResponse.CurrentSquareInfo.create(squareCode, 49.5, 15.7, "Nedefinováno", "#ffffff");
    }

    /**
     * Collect validation statuses for all 8 neighboring squares around the given square.
     * Returns a list with direction information suitable for navigation.
     * <p>
     * Grid layout (viewed from above, north is up):
     * <pre>
     *   NW    N    NE
     *   W   [C]    E
     *   SW    S    SE
     * </pre>
     *
     * @param messages   Messages for localization
     * @param taxon      The taxon to check
     * @param squareCode The central square code
     * @return List of SquareValidationStatusDto with direction, squareId, text, and color
     */
    private List<SquareValidationStatusResponse.SquareValidationStatusDto> collectValidationStatusesForReact(Messages messages, Taxon taxon, int squareCode) {
        List<SquareValidationStatusResponse.SquareValidationStatusDto> result = new ArrayList<>();

        int horizontal = (squareCode % 100);  // East-west position (increases west to east)
        int vertical = (squareCode / 100);  // North-south position (increases north to south)

        // Direction offsets: {verticalOffset, horizontalOffset, directionName}
        // Order: N, NE, E, SE, S, SW, W, NW (clockwise from north)
        String[][] directions = {
            {"-1", "0", "north"},
            {"-1", "1", "northeast"},
            {"0", "1", "east"},
            {"1", "1", "southeast"},
            {"1", "0", "south"},
            {"1", "-1", "southwest"},
            {"0", "-1", "west"},
            {"-1", "-1", "northwest"}
        };

        for (String[] dir : directions) {
            int vOffset = Integer.parseInt(dir[0]);
            int hOffset = Integer.parseInt(dir[1]);
            String directionName = dir[2];

            int neighborVertical = vertical + vOffset;
            int neighborHorizontal = horizontal + hOffset;
            int neighborSquareId = neighborVertical * 100 + neighborHorizontal;

            FieldValidationStatus status = buildValidationStatus(messages, taxon, neighborSquareId);
            result.add(SquareValidationStatusResponse.SquareValidationStatusDto.create(directionName, neighborSquareId, status.getText(), status.getColor()));
        }

        return result;
    }

    private FieldValidationStatus buildValidationStatus(Messages messages, Taxon taxon, int neighborSquareId) {

        String leftPaddedSquareCode = MapSquareUtils.squareIdToString(neighborSquareId);

        String rawSql =
            " SELECT records.id, records.validation_status " +
                " FROM atlas.records AS records, " +
                "      geodata.squares_full as squares, " +
                "      atlas.record_validation_status as valstat " +
                " WHERE ST_CONTAINS(squares.geom_wgs, records.coords_wgs) " +
                "      AND squares.code = :squareCode " +
                "      AND records.taxon_id = :taxonId " +
                "      AND records.validation_status = valstat.id " +
                " ORDER BY valstat.priority desc " +
                " LIMIT 1 ";

        List<SqlRow> rows = DB.sqlQuery(rawSql)
            .setParameter("squareCode", leftPaddedSquareCode)
            .setParameter("taxonId", taxon.getId())
            .findList();

        FieldValidationStatus fieldStatus;
        if (rows.isEmpty()) {
            fieldStatus = new FieldValidationStatus(messages.at("Atlas.undefined"),
                FieldValidationStatus.UndefinedColor);
        } else {
            int validationStatus = rows.getFirst().getInteger("validation_status");
            RecordValidationStatus recStatus = RecordValidationStatus.find().byId(validationStatus);
            fieldStatus = new FieldValidationStatus(recStatus.getDescription(), recStatus.getColor());
        }

        return fieldStatus;
    }

    /**
     * Get PLADIAS records within 10km distance from the square centroid.
     * Returns MINIMAL data suitable for map display.
     *
     * @param taxon  The taxon to filter by
     * @param square The square to get centroid from
     * @param currentUser The current user for permission checks
     * @return List of RecordPladiasMinimalDto
     */
    private List<RecordPladiasMinimalDto> getNearbyPladiasRecords(Long taxon, MapSquareNew square, User currentUser) {
        geom.Point centroid = square.getCentroid();
        double longitude = centroid.getX();
        double latitude = centroid.getY();

        // Search buffer around KFME square centroid
        final double bufferMeters = 7000; // meters around square centroid

        double latDegrees = bufferMeters / 111320.0;
        double lonDegrees = bufferMeters / (111320.0 * Math.cos(Math.toRadians(latitude)));

        // Query records within buffer zone
        // Join with geodata.quadrants_full to get computed quadrant/square code from coordinates
        // Include validation status for map coloring
        String sql = """
            SELECT r.id,
                   r.latitude,
                   r.longitude,
                   r.gps_coords_precision,
                   r.datum,
                   CONCAT_WS(', ', COALESCE(a.surname, '')) AS recorded_by,
                   r.validation_status,
                   rvs.color AS validation_status_color,
                   q.code AS computed_quadrant_code
            FROM atlas.records r
            LEFT JOIN geodata.quadrants_full q
                   ON ST_Contains(q.geom_wgs, r.coords_wgs)
            LEFT JOIN atlas.records_authors ra ON r.id = ra.records_id
            LEFT JOIN atlas.authors a ON a.id = ra.authors_id
            LEFT JOIN atlas.record_validation_status rvs ON r.validation_status = rvs.id
            WHERE r.taxon_id = :taxonId
              AND r.coords_wgs && ST_MakeEnvelope(
                    :longitude - :dLon,
                    :latitude  - :dLat,
                    :longitude + :dLon,
                    :latitude  + :dLat,
                    4326
              )
            ORDER BY r.latitude DESC, r.longitude DESC, r.id;""";

        List<SqlRow> rows = DB.sqlQuery(sql)
            .setParameter("taxonId", taxon)
            .setParameter("longitude", longitude)
            .setParameter("latitude", latitude)
            .setParameter("dLat", latDegrees)
            .setParameter("dLon", lonDegrees)
            .findList();

        List<RecordPladiasMinimalDto> dtos = new ArrayList<>();
        for (SqlRow row : rows) {
            String computedQuadrantCode = row.getString("computed_quadrant_code");
            String computedSquareCode = null;
            if (computedQuadrantCode != null && computedQuadrantCode.length() > 1) {
                computedSquareCode = computedQuadrantCode.substring(0, computedQuadrantCode.length() - 1);
            }

            dtos.add(new RecordPladiasMinimalDto(
                row.getLong("id"),
                row.getDouble("latitude"),
                row.getDouble("longitude"),
                row.getInteger("gps_precision"),
                row.getInteger("year"),
                row.getString("recorded_by"),
                row.getInteger("validation_status_id"),
                row.getString("validation_status_color"),
                computedSquareCode
            ));
        }

        return dtos;
    }

    /**
     * Get PLADIAS records ONLY from the given square.
     * Returns FULL data suitable for table display.
     *
     */
    private List<RecordPladiasDto> getSquarePladiasRecords(Long taxonId, String squareCode, User currentUser) {

        // Query records where computed_square_code matches the given square
        String sql = """
            SELECT r.id
            FROM atlas.records r
            LEFT JOIN geodata.squares_full s
                   ON ST_Contains(s.geom_wgs, r.coords_wgs)
            WHERE r.taxon_id = :taxonId
              AND s.code = :squareCode
            ORDER BY r.latitude DESC, r.longitude DESC, r.id;""";

        List<SqlRow> rows = DB.sqlQuery(sql)
            .setParameter("taxonId", taxonId)
            .setParameter("squareCode", squareCode)
            .findList();

        Map<Long, String> quadrantCodes = new HashMap<>();
        List<Long> ids = new ArrayList<>();

        for (SqlRow row : rows) {
            Long id = row.getLong("id");
            ids.add(id);
            quadrantCodes.put(id, row.getString("computed_quadrant_code"));
        }

        List<Record> recordList = Record.find()
            .query()
            .fetch("quadrant")
            .fetch("validationStatus")
            .fetch("originalityStatus")
            .fetch("license")
            .fetch("district")
            .fetch("phytochorion")
            .fetch("project.institution")
            .fetch("batch.author")
            .fetch("batch.committer")
            .fetch("license")
            .fetch("taxon")
            .fetch("recordAuthors.author")
            .fetch("comments.author")
            .fetch("quadrants_legacy.square")
            .fetch("herbariums")
            .fetch("mapSquares_legacy")
            .fetch("quadrants_legacy")
            .where()
            .idIn(ids)
            .findList();

        Map<Long, Record> records = recordList.stream()
            .collect(Collectors.toMap(Record::getId, Function.identity()));

        Map<Long, Boolean> historyByRecordId = Record.hasHistoryById(ids);

        List<RecordPladiasDto> dtos = new ArrayList<>();

        for (Long id : ids) {
            Record record = records.get(id);
            if (record != null) {
                String computedQuadrantCode = quadrantCodes.get(id);
                String computedSquareCode = null;
                if (computedQuadrantCode != null && computedQuadrantCode.length() > 1) {
                    computedSquareCode = computedQuadrantCode.substring(0, computedQuadrantCode.length() - 1);
                }
                Boolean hasHistory = historyByRecordId.get(id);
                dtos.add(RecordPladiasDto.fromRecord(record, currentUser, computedQuadrantCode, computedSquareCode, false, hasHistory));
            }
        }

        return dtos;
    }

    /**
     * Get GBIF/iNaturalist records within 10km distance from the square centroid.
     * Returns MINIMAL data suitable for map display.
     *
     * @param taxon         The taxon to filter by
     * @param square        The square to get centroid from
     * @param isInaturalist true for iNaturalist, false for GBIF
     * @return List of RecordGbifMinimalDto
     */
    private List<RecordGbifMinimalDto> getNearbyGbifRecords(Long taxon, MapSquareNew square, boolean isInaturalist) {
        geom.Point centroid = square.getCentroid();
        double longitude = centroid.getX();
        double latitude = centroid.getY();

        // Search buffer around KFME square centroid
        final double bufferMeters = 7000; // meters around square centroid

        double latDegrees = bufferMeters / 111320.0;
        double lonDegrees = bufferMeters / (111320.0 * Math.cos(Math.toRadians(latitude)));

        String institutionFilter = isInaturalist
            ? "g.institution_code = 'iNaturalist'"
            : "g.institution_code != 'iNaturalist'";

        String sql =
            "SELECT g.id," +
                "       ST_Y(g.coords) AS latitude, " +
                "       ST_X(g.coords) AS longitude, " +
                " g.coords_precision AS gps_precision," +
                " g.year," +
                "  g.recorded_by," +
                "  g.institution_code," +
                "  q.letter AS quadrant_letter," +
                "  s.code AS square_code" +
                "   FROM gbif.records g" +
                " LEFT JOIN geodata.quadrants_full q ON ST_Contains(q.geom_wgs, g.coords)" +
                " LEFT JOIN geodata.squares_full s ON s.id = q.square_id" +
                " INNER JOIN gbif.taxa t ON t.taxon_key = g.taxon_key" +
                " WHERE t.pladias_taxon_id = :taxonId" +
                "  AND " + institutionFilter +
              "AND g.coords && ST_MakeEnvelope(" +
                "   :longitude - :dLon," +
                "   :latitude  - :dLat," +
                "   :longitude + :dLon," +
                "    :latitude  + :dLat," +
                "    4326" +
                " )" +
                " ORDER BY latitude DESC, longitude DESC;";

        List<SqlRow> rows = DB.sqlQuery(sql)
            .setParameter("taxonId", taxon)
            .setParameter("longitude", longitude)
            .setParameter("latitude", latitude)
            .setParameter("dLat", latDegrees)
            .setParameter("dLon", lonDegrees)
            .findList();

        List<RecordGbifMinimalDto> dtos = new ArrayList<>();
        for (SqlRow row : rows) {
            dtos.add(RecordGbifMinimalDto.fromSqlRow(row));
        }

        return dtos;
    }

    /**
     * Get GBIF/iNaturalist records ONLY from the given square.
     * Returns MINIMAL data suitable for map display.
     *
     * @param taxon         The taxon to filter by
     * @param square        The square code
     * @param isInaturalist true for iNaturalist, false for GBIF
     * @return List of RecordGbifMinimalDto
     */
    private List<RecordGbifMinimalDto> getSquareGbifRecords(Long taxon, String square, boolean isInaturalist) {
        String institutionFilter = isInaturalist
            ? "g.institution_code = 'iNaturalist'"
            : "g.institution_code != 'iNaturalist'";

        String sql = "SELECT g.id, " +
            "       ST_Y(g.coords) AS latitude, " +
            "       ST_X(g.coords) AS longitude, " +
            "       g.coords_precision AS gps_precision, " +
            "       g.year, " +
            "       g.recorded_by, " +
            "       g.institution_code, " +
            "       q.letter AS quadrant_letter, " +
            "       s.code AS square_code, " +
            "       s.code AS computed_square_code " +
            "FROM gbif.records g " +
            "LEFT JOIN geodata.quadrants_full q ON ST_Contains(q.geom_wgs, g.coords) " +
            "LEFT JOIN geodata.squares_full s ON s.id = q.square_id " +
            "INNER JOIN gbif.taxa t ON t.taxon_key = g.taxon_key " +
            "WHERE t.pladias_taxon_id = :taxonId " +
            "  AND " + institutionFilter +
            "  AND s.code = :squareCode " +
            "ORDER BY q.letter";

        List<SqlRow> rows = DB.sqlQuery(sql)
            .setParameter("taxonId", taxon)
            .setParameter("squareCode", square)
            .findList();

        List<RecordGbifMinimalDto> dtos = new ArrayList<>();
        for (SqlRow row : rows) {
            dtos.add(RecordGbifMinimalDto.fromSqlRow(row));
        }

        return dtos;
    }
    /**
     * Enum for project types supported by the nearby records endpoint.
     */
    public enum ProjectType {
        GBIF("gbif"),
        INATURALIST("inaturalist"),
        PLADIAS("pladias");

        private final String abbrev;

        ProjectType(String abbrev) {
            this.abbrev = abbrev;
        }

        public static ProjectType fromString(String value) {
            for (ProjectType type : ProjectType.values()) {
                if (type.abbrev.equalsIgnoreCase(value)) {
                    return type;
                }
            }
            return null;
        }

        public String getAbbrev() {
            return abbrev;
        }
    }

    /**
     * Helper class for validation status.
     */
    public static class FieldValidationStatus {
        public static final String UndefinedColor = "#ffffff";
        private String text;
        private String color;

        public FieldValidationStatus(String text, String rgbColor) {
            this.text = text;
            this.color = rgbColor;
        }

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String color) {
            this.color = color;
        }
    }

    /**
     * Helper class for returning results from service methods.
     */
    public static class MapDetailResult {
        private final boolean success;
        private final Object data;
        private final String error;

        private MapDetailResult(boolean success, Object data, String error) {
            this.success = success;
            this.data = data;
            this.error = error;
        }

        public static MapDetailResult success(Object data) {
            return new MapDetailResult(true, data, null);
        }

        public static MapDetailResult error(String error) {
            return new MapDetailResult(false, null, error);
        }

        public boolean isSuccess() {
            return success;
        }

        public Object getData() {
            return data;
        }

        public String getError() {
            return error;
        }
    }
}

package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.atlas.RecordGbifMinimalDto;
import dto.atlas.RecordPladiasDto;
import dto.atlas.RecordPladiasFullDto;
import dto.atlas.SquareValidationStatusResponse;
import io.ebean.DB;
import io.ebean.SqlRow;
import models.*;
import models.Record;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;
import utils.MapSquareUtils;
import utils.SessionUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Security.Authenticated(Authorized.class)
public class MapDetailController extends ControllerBase {

    /**
     * Get validation statuses for the 8 neighboring squares around the given square for a specific taxon.
     * This is a React API endpoint that returns JSON data with direction information for navigation
     * and current square centroid for map centering.
     *
     * @param request    HTTP request
     * @param squareCode The central square code
     * @param taxonId    The ID of the taxon
     * @return JSON response with SquareValidationStatusResponse containing neighbors and current square info
     */
    public Result getSquareInfo(Http.Request request, int squareCode, Long taxonId) {
        Messages messages = getMessages(request);
        Taxon taxon = Taxon.find().byId(taxonId);

        // Get neighbor validation statuses
        List<SquareValidationStatusResponse.SquareValidationStatusDto> neighbors = collectValidationStatusesForReact(messages, taxon, squareCode);

        // Get current square centroid information
        SquareValidationStatusResponse.CurrentSquareInfo currentSquareInfo = getCurrentSquareInfo(messages, taxon, squareCode);

        SquareValidationStatusResponse response = SquareValidationStatusResponse.create(neighbors, currentSquareInfo);
        return ok(JsonResult.buildSuccess(response));
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
            int horizontal = (squareCode % 100);
            int vertical = (squareCode / 100);
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
        int validationStatus = RecordValidationStatus.Unprocessed;
        if (rows.isEmpty()) {
            fieldStatus = new FieldValidationStatus(messages.at("Atlas.undefined"),
                FieldValidationStatus.UndefinedColor);
        } else {
            validationStatus = rows.get(0).getInteger("validation_status");
            RecordValidationStatus recStatus = RecordValidationStatus.find().byId(validationStatus);
            fieldStatus = new FieldValidationStatus(recStatus.getDescription(), recStatus.getColor());
        }

        return fieldStatus;
    }

    /**
     * Get records within 10km distance from the centroid of a given square for a specific taxon and project.
     * Delegates to specific project type methods.
     *
     * @param request    HTTP request
     * @param squareCode The square code (e.g., 5252)
     * @param taxonId    The taxon ID
     * @param project    Project type (gbif, inaturalist, pladias)
     * @return JSON response with list of record DTOs
     */
    public Result getNearbyRecords(Http.Request request, String squareCode, Long taxonId, String project) {
        ProjectType projectType = ProjectType.fromString(project);
        if (projectType == null) {
            return badRequest(JsonResult.error("Invalid project type. Must be one of: gbif, inaturalist, pladias"));
        }

        // Validate common parameters
        Taxon taxon = Taxon.find().byId(taxonId);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }

        MapSquareNew square = MapSquareNew.find().query().where().eq("code", squareCode).findOne();
        if (square == null) {
            return notFound(JsonResult.error("Square not found"));
        }

        User currentUser = SessionUtils.getCurrentUser(request.session());


        // Delegate to specific project type method
        switch (projectType) {
            case PLADIAS:
                return getNearbyPladiasRecords(taxon, square, currentUser);
            case INATURALIST:
                return getNearbyGbifRecords(taxon, square, true);
            case GBIF:
                return getNearbyGbifRecords(taxon, square, false);
            default:
                return badRequest(JsonResult.error("Unsupported project type"));
        }
    }

    /**
     * Get PLADIAS records within 10km distance from the square centroid.
     *
     * @param taxon  The taxon to filter by
     * @param square The square to get centroid from
     * @return JSON response with list of RecordPladiasDto
     */
    private Result getNearbyPladiasRecords(Taxon taxon, MapSquareNew square, User currentUser) {
        geom.Point centroid = square.getCentroid();
        double longitude = centroid.getX();
        double latitude = centroid.getY();

        // Search buffer around KFME square centroid
        final double bufferMeters = 7000; // meters around square centroid

        double latDegrees = bufferMeters / 111320.0;
        double lonDegrees = bufferMeters / (111320.0 * Math.cos(Math.toRadians(latitude)));

        // Query records within 20km
        // Join with geodata.quadrants_full to get computed quadrant code from coordinates
        // Sort by latitude and longitude
        String sql = "SELECT r.id,\n" +
            "       q.code AS computed_quadrant_code\n" +
            "FROM atlas.records r\n" +
            "LEFT JOIN geodata.quadrants_full q\n" +
            "       ON ST_Contains(q.geom_wgs, r.coords_wgs)\n" +
            "WHERE r.taxon_id = :taxonId\n" +
            "  AND r.coords_wgs && ST_MakeEnvelope(\n" +
            "        :longitude - :dLon,\n" +
            "        :latitude  - :dLat,\n" +
            "        :longitude + :dLon,\n" +
            "        :latitude  + :dLat,\n" +
            "        4326\n" +
            "  )\n" +
            "ORDER BY r.latitude DESC, r.longitude DESC, r.id;";

        List<io.ebean.SqlRow> rows = DB.sqlQuery(sql)
            .setParameter("taxonId", taxon.getId())
            .setParameter("longitude", longitude)
            .setParameter("latitude", latitude)
            .setParameter("dLat", latDegrees)
            .setParameter("dLon", lonDegrees)
            .findList();

        // Fetch full records by ID with computed quadrant/square code from coordinates
        Map<Long, String> quadrantCodes = new HashMap<>();

        List<Long> ids = new ArrayList<>();

        for (io.ebean.SqlRow row : rows) {
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

        // Batch-fetch history existence for all records to avoid N+1 queries
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

                dtos.add(
                    RecordPladiasDto.fromRecord(
                        record,
                        currentUser,
                        computedQuadrantCode,
                        computedSquareCode,
                        false,
                        hasHistory
                    )
                );
            }
        }

        return ok(JsonResult.buildSuccess(dtos));
    }

    /**
     * Get GBIF records within 10km distance from the square centroid.
     *
     * @param taxon           The taxon to filter by
     * @param square          The square to get centroid from
     * @param inaturalistOnly If true, filter for iNaturalist records only; if false, exclude iNaturalist
     * @return JSON response with list of RecordGbifMinimalDto
     */
    private Result getNearbyGbifRecords(Taxon taxon, MapSquareNew square, boolean inaturalistOnly) {
        geom.Point centroid = square.getCentroid();
        double longitude = centroid.getX();
        double latitude = centroid.getY();

        // Build institution_code filter
        String institutionFilter = inaturalistOnly
            ? "institution_code = 'iNaturalist'"
            : "(institution_code IS NULL OR institution_code != 'iNaturalist')";

        // Query GBIF records within 10km using ST_DistanceSphere
        // Join with geodata.quadrants_full and geodata.squares_full to get quadrant letter and square code
        String sql = "SELECT g.gbif_id, " +
            "       ST_Y(g.coords) AS latitude, " +
            "       ST_X(g.coords) AS longitude, " +
            "       g.coords_precision, " +
            "       g.year, " +
            "       g.recorded_by, " +
            "       g.institution_code, " +
            "       q.letter AS quadrant_letter, " +
            "       s.code AS square_code " +
            "FROM gbif.records g " +
            "LEFT JOIN geodata.quadrants_full q ON ST_Contains(q.geom_wgs, g.coords) " +
            "LEFT JOIN geodata.squares_full s ON q.square_id = s.id " +
            "INNER JOIN gbif.taxa t ON t.taxon_key = g.taxon_key " +
            "WHERE t.pladias_taxon_id = :taxonId " +
            "  AND " + institutionFilter +
            "  AND ST_DistanceSphere(g.coords, " +
            "      s.centroid_wgs)" +
            "   < 10000 " +
            "ORDER BY q.letter";

        List<io.ebean.SqlRow> rows = DB.sqlQuery(sql)
            .setParameter("taxonId", taxon.getId())
            .setParameter("longitude", longitude)
            .setParameter("latitude", latitude)
            .findList();

        List<RecordGbifMinimalDto> dtos = new ArrayList<>();
        for (io.ebean.SqlRow row : rows) {
            dtos.add(RecordGbifMinimalDto.fromSqlRow(row));
        }

        return ok(JsonResult.buildSuccess(dtos));
    }

    /**
     * Get a single PLADIAS record by ID with full relationship data.
     * Includes all 1:M relationships at first level and M:N relationships at second level.
     *
     * @param request  HTTP request
     * @param recordId The record ID
     * @return JSON response with RecordPladiasFullDto
     */
    public Result getRecordFull(Http.Request request, Long recordId) {
        if (recordId == null) {
            return badRequest(JsonResult.error("Record ID is required"));
        }

        Record record = Record.find().byId(recordId);
        if (record == null) {
            return notFound(JsonResult.error("Record not found"));
        }

        User currentUser = SessionUtils.getCurrentUser(request.session());

        RecordPladiasFullDto dto = RecordPladiasFullDto.fromRecord(record, currentUser);
        return ok(JsonResult.buildSuccess(dto));
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
}

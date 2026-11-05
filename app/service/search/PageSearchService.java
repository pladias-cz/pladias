package service.search;

import com.google.inject.Inject;
import controllers.atlas.SearchController;
import dto.atlas.DashboardBucketDto;
import dto.atlas.QuadrantAggregateDto;
import dto.atlas.RecordPladiasDto;
import excel.LicenseDictionary;
import io.ebean.DB;
import io.ebean.SqlQuery;
import io.ebean.SqlRow;
import models.*;
import models.Record;
import org.apache.commons.lang3.StringUtils;
import org.joda.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import repositories.ISquareRepository;
import service.config.IConfigService;
import service.records.RecordEditPermissions;
import utils.MapSquareResolver;
import utils.SqlUtils;

import java.sql.Timestamp;
import java.util.*;
import java.util.stream.Collectors;

public class PageSearchService implements IPageSearchService {
    private static final int SEARCH_RESULTS_BATCH_SIZE = 10000;
    /** Klíče agregací dashboardu – sdílené s frontend registry (form.aggregates). */
    private static final String AGGREGATE_YEAR = "year";
    private static final String AGGREGATE_ALTITUDE = "altitude";
    private static final String AGGREGATE_LICENSE = "license";
    private static final String AGGREGATE_HERBARIUM = "herbarium";
    /** Šířka výškového pásma dashboardu (m). */
    private static final int ALTITUDE_BAND_SIZE = 200;
    private static final Logger logger = LoggerFactory.getLogger(PageSearchService.class);
    private static ISquareRepository squareRepository;
    private final IConfigService configService;

    @Inject
    public PageSearchService(ISquareRepository repository, IConfigService configService) {
        squareRepository = repository;
        this.configService = configService;
    }

    @Override
    public PageSearchResults search(User currentUser, SearchController.SearchForm form,
                                    int page, int pageSize, boolean getTotalCount) {
        // Ochrana proti přetížení: bez aplikovaného filtru vracíme prázdný
        // výsledek (záznamy, total count i excel export) – vylistování celé
        // tabulky záznamů nemá smysl.
        if (!form.hasActiveFilter()) {
            return new PageSearchResults();
        }
        try {
            SearchFilterContext filterContext = buildSearchFilterContext(currentUser, form);

            Integer totalCount = null;
            if (getTotalCount) {
                String totalFromClause = buildFromClause(currentUser, form, false);
                totalCount = getTotalCountRecords(totalFromClause, filterContext);
            }

            String fromClause = buildFromClause(currentUser, form, true);
            String orderClause = getOrderByClause(form);
            List<Long> recordIds = getRecordIds(fromClause, filterContext, orderClause, page, pageSize);

            PageSearchResults pageSearchResults = null;

            if (isExcelExport(form)) {
                pageSearchResults = getExcelResults(recordIds, totalCount);
            } else {
                pageSearchResults = getBrowserResults(recordIds, currentUser, totalCount, true);
            }

            return pageSearchResults;
        } catch (Exception e) {
            logger.error("Failure during record loading.", e);
        }
        return new PageSearchResults();
    }

    @Override
    public List<RecordIdEditTimestampPair> searchRecordEditTimestamps(User currentUser, SearchController.SearchForm form) {
        try {
            SearchFilterContext filterContext = buildSearchFilterContext(currentUser, form);
            String fromClause = buildFromClause(currentUser, form, true);
            String orderClause = getOrderByClause(form);

            String query = buildSelectQuery("R.id, R.edit_timestamp", fromClause, filterContext.whereClause, orderClause, 0, 0);
            SqlQuery sqlQuery = DB.sqlQuery(query);
            filterContext.parameters.applyTo(sqlQuery);
            List<SqlRow> rows = sqlQuery.findList();

            List<RecordIdEditTimestampPair> result = new ArrayList<>();
            for (SqlRow row : rows) {
                Long id = row.getLong("id");
                Timestamp editTimestamp = row.getTimestamp("edit_timestamp");
                if (id != null && editTimestamp != null) {
                    result.add(new RecordIdEditTimestampPair(id, editTimestamp));
                }
            }

            return result;
        } catch (Exception e) {
            logger.error("Failure during record edit timestamps loading.", e);
        }

        return List.of();
    }

    @Override
    public List<QuadrantAggregateDto> searchQuadrants(User currentUser, SearchController.SearchForm form) {
        // Ochrana proti přetížení: bez aplikovaného filtru žádné kvadranty
        // (viz search) – neagregujeme celou tabulku pro markery mapy.
        if (!form.hasActiveFilter()) {
            return List.of();
        }
        try {
            SearchFilterContext filterContext = buildSearchFilterContext(currentUser, form);
            String fromClause = buildFromClause(currentUser, form, false);

            // buildFromClause vždy začíná pevnou hlavičkou „FROM atlas.records AS R“ –
            // kvadrantovou mřížku vložíme mezi tabulku záznamů a ostatní joiny filtrů,
            // aby podmínka ON následovala přímo za INNER JOIN records.
            String recordsHeader = " FROM " + Record.QualifiedTableName + " AS R ";
            String remainingJoins = fromClause.substring(recordsHeader.length());

            // Agregace kvadrantů celého výsledku (stránkování se ignoruje): kvadrant
            // záznamu z přesných souřadnic (st_within) – stejná sémantika jako sloupec
            // Kvadrant v tabulkovém výpisu; záznamy bez souřadnic marker nepřidají.
            // COUNT(DISTINCT) kvůli duplicitám z INNER JOINů filtrů (authors, herbariums).
            String sql = "SELECT Q.id AS quadrant_id, Q.code AS quadrant_code, " +
                "ST_Y(ST_Centroid(Q.geom_wgs)) AS lat, ST_X(ST_Centroid(Q.geom_wgs)) AS lon, " +
                "COUNT(DISTINCT R.id) AS records_count " +
                "FROM " + QuadrantNew.QualifiedTableName + " AS Q " +
                "INNER JOIN " + Record.QualifiedTableName + " AS R ON st_within(R.coords_wgs, Q.geom_wgs) " +
                remainingJoins +
                filterContext.whereClause +
                "GROUP BY Q.id, Q.code, Q.geom_wgs " +
                "ORDER BY Q.code";

            SqlQuery sqlQuery = DB.sqlQuery(sql);
            filterContext.parameters.applyTo(sqlQuery);
            List<SqlRow> rows = sqlQuery.findList();

            List<QuadrantAggregateDto> result = new ArrayList<>();
            for (SqlRow row : rows) {
                result.add(new QuadrantAggregateDto(
                    row.getInteger("quadrant_id"),
                    row.getString("quadrant_code"),
                    row.getDouble("lat"),
                    row.getDouble("lon"),
                    row.getInteger("records_count")
                ));
            }
            return result;
        } catch (Exception e) {
            logger.error("Failure during search quadrants aggregation loading.", e);
        }
        return List.of();
    }

    @Override
    public Map<String, List<DashboardBucketDto>> searchAggregates(User currentUser, SearchController.SearchForm form) {
        Map<String, List<DashboardBucketDto>> result = new LinkedHashMap<>();
        Set<String> requested = parseRequestedAggregates(form.getAggregates());
        if (requested.isEmpty()) {
            return result;
        }

        // Ochrana proti přetížení: bez aplikovaného filtru prázdné agregace
        // (viz search) – widgety dashboardu dostanou prázdné buckety, ale
        // neagregujeme celou tabulku.
        if (!form.hasActiveFilter()) {
            for (String aggregate : requested) {
                result.put(aggregate, List.of());
            }
            return result;
        }

        try {
            SearchFilterContext filterContext = buildSearchFilterContext(currentUser, form);
            String fromClause = buildFromClause(currentUser, form, false);
            String whereClause = filterContext.whereClause;

            // rok nálezu – label přímo v SQL (to_char), vzestupně; bez data → bucket bez labelu
            if (requested.contains(AGGREGATE_YEAR)) {
                String yearExpression = "to_char(R.datum, 'YYYY')";
                String sql = "SELECT " + yearExpression + " AS label, COUNT(DISTINCT R.id) AS cnt " +
                    fromClause + whereClause +
                    "GROUP BY " + yearExpression + " ORDER BY label";
                result.put(AGGREGATE_YEAR, mapLabelBuckets(runAggregationQuery(sql, filterContext)));
            }

            // nadmořská výška – reprezentativní hodnota COALESCE(min, max) v pásmech;
            // label pásma („200–399") se skládá v Javě; bez výšky → bucket bez labelu
            if (requested.contains(AGGREGATE_ALTITUDE)) {
                String bandExpression = "(COALESCE(R.altitude_min, R.altitude_max) / " + ALTITUDE_BAND_SIZE
                    + ") * " + ALTITUDE_BAND_SIZE;
                String sql = "SELECT " + bandExpression + " AS band_start, COUNT(DISTINCT R.id) AS cnt " +
                    fromClause + whereClause +
                    "GROUP BY " + bandExpression + " ORDER BY band_start";
                List<DashboardBucketDto> buckets = new ArrayList<>();
                for (SqlRow row : runAggregationQuery(sql, filterContext)) {
                    Integer bandStart = row.getInteger("band_start");
                    String label = bandStart == null ? null : bandStart + "–" + (bandStart + ALTITUDE_BAND_SIZE - 1);
                    buckets.add(new DashboardBucketDto(label, row.getLong("cnt")));
                }
                result.put(AGGREGATE_ALTITUDE, buckets);
            }

            // licence – LEFT JOIN: záznamy bez licence tvoří bucket bez labelu; sestupně podle počtu
            if (requested.contains(AGGREGATE_LICENSE)) {
                String sql = "SELECT L.key AS label, COUNT(DISTINCT R.id) AS cnt " +
                    fromClause + " LEFT JOIN " + License.QualifiedTableName + " AS L ON R.license_id = L.id " +
                    whereClause +
                    "GROUP BY L.key ORDER BY cnt DESC, label";
                result.put(AGGREGATE_LICENSE, mapLabelBuckets(runAggregationQuery(sql, filterContext)));
            }

            // herbář – LEFT JOIN: záznam s více herbáři se započte do každého, bez
            // herbáře tvoří bucket bez labelu; sestupně podle počtu
            if (requested.contains(AGGREGATE_HERBARIUM)) {
                String sql = "SELECT H.name AS label, COUNT(DISTINCT R.id) AS cnt " +
                    fromClause +
                    " LEFT JOIN atlas.records_herbariums AS RH ON R.id = RH.records_id" +
                    " LEFT JOIN " + Herbarium.QualifiedTableName + " AS H ON RH.herbariums_id = H.id " +
                    whereClause +
                    "GROUP BY H.name ORDER BY cnt DESC, label";
                result.put(AGGREGATE_HERBARIUM, mapLabelBuckets(runAggregationQuery(sql, filterContext)));
            }

            return result;
        } catch (Exception e) {
            logger.error("Failure during search aggregates loading.", e);
        }
        return result;
    }

    /** Spustí agregační dotaz se svázanými parametry filtrů vyhledávání. */
    private List<SqlRow> runAggregationQuery(String sql, SearchFilterContext filterContext) {
        SqlQuery sqlQuery = DB.sqlQuery(sql);
        filterContext.parameters.applyTo(sqlQuery);
        return sqlQuery.findList();
    }

    /** Mapuje řádky (label, cnt) na buckety – label null znamená „hodnota nezadána". */
    private List<DashboardBucketDto> mapLabelBuckets(List<SqlRow> rows) {
        List<DashboardBucketDto> buckets = new ArrayList<>();
        for (SqlRow row : rows) {
            buckets.add(new DashboardBucketDto(row.getString("label"), row.getLong("cnt")));
        }
        return buckets;
    }

    /** Parsování form.aggregates – comma-separated id; neznámá id se ignorují
     * (dopředná kompatibilita s uloženým výběrem widgetů). */
    private Set<String> parseRequestedAggregates(String aggregates) {
        if (StringUtils.isBlank(aggregates)) {
            return Set.of();
        }
        Set<String> known = Set.of(AGGREGATE_YEAR, AGGREGATE_ALTITUDE, AGGREGATE_LICENSE, AGGREGATE_HERBARIUM);
        Set<String> requested = new LinkedHashSet<>();
        for (String token : aggregates.split(",")) {
            String id = token.trim();
            if (known.contains(id)) {
                requested.add(id);
            } else {
                logger.warn("Unknown search aggregate requested: {}", id);
            }
        }
        return requested;
    }

    @Override
    public PageSearchResults getRecordsWithComments(User user) {
        List<RecordComment> comments = user.getRecordComments();
        Set<Long> record_ids = new HashSet<>();
        for (RecordComment c : comments) {
            record_ids.add(c.getRecordId());
        }
        List<Long> recordIds = new ArrayList<>(record_ids);
        PageSearchResults pageSearchResults = getBrowserResults(recordIds, user, recordIds.size(), false);
        return pageSearchResults;
    }

    private MapSquareResolver.SquareData getSquareData(SearchController.SearchForm form) {
        if (StringUtils.isBlank(form.quadrant)) {
            return null;
        }
        MapSquareResolver resolver = new MapSquareResolver(squareRepository);
        String[] definitions = form.quadrant.split(";");
        return resolver.resolve(definitions);
    }

    private SearchFilterContext buildSearchFilterContext(User currentUser, SearchController.SearchForm form) throws Exception {
        MapSquareResolver.SquareData squareData = getSquareData(form);
        Set<QuadrantNew> quadrants = squareData != null ? squareData.quadrants : null;
        Set<MapSquareNew> squares = squareData != null ? squareData.squares : null;
        QueryParameters parameters = new QueryParameters();
        String whereClause = buildWhereClause(currentUser, form, quadrants, squares, parameters);
        return new SearchFilterContext(whereClause, parameters);
    }

    private List<Long> getRecordIds(String fromClause, SearchFilterContext filterContext, String orderClause,
                                    int page, int pageSize) throws Exception {
        int offset = (page - 1) * pageSize;
        String query = buildQuery(fromClause, filterContext.whereClause, orderClause, false, pageSize, offset);
        SqlQuery sqlQuery = DB.sqlQuery(query);
        filterContext.parameters.applyTo(sqlQuery);
        List<SqlRow> rows = sqlQuery.findList();
        List<Long> recordIds = rows.stream()
            .map(row -> row.getLong("id"))
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());
        return recordIds;
    }

    private PageSearchResults getBrowserResults(List<Long> ids, User currentUser, Integer totalCount, Boolean disableEditing) {
        if (ids == null || ids.isEmpty()) {
            return new PageSearchResults();
        }

        Map<Long, String> computedQuadrantCodes = getComputedQuadrantCodes(ids);

        List<Record> foundRecords = Record.find().query()
            .where().idIn(ids)
            .findList();

        Map<Long, RecordPladiasDto> recordsById = new HashMap<>();

        // One permissions context per request (2 queries), then O(1) per record
        RecordEditPermissions permissions = RecordEditPermissions.forUser(currentUser);

        for (Record record : foundRecords) {
            String computedQuadrantCode = computedQuadrantCodes.get(record.getId());
            String computedSquareCode = null;
            if (computedQuadrantCode != null && computedQuadrantCode.length() > 1) {
                computedSquareCode = computedQuadrantCode.substring(0, computedQuadrantCode.length() - 1);
            }
            RecordPladiasDto dto = RecordPladiasDto.fromRecord(record, currentUser, permissions, computedQuadrantCode, computedSquareCode, disableEditing);
            recordsById.put(record.getId(), dto);
        }

        List<RecordPladiasDto> orderedRecords = new ArrayList<>();
        for (Long id : ids) {
            RecordPladiasDto record = recordsById.get(id);
            if (record != null) {
                orderedRecords.add(record);
            }
        }

        return new PageSearchResults(List.of(), orderedRecords, totalCount);
    }

    private Map<Long, String> getComputedQuadrantCodes(List<Long> ids) {
        Map<Long, String> quadrantCodesByRecordId = new HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return quadrantCodesByRecordId;
        }

        String sqlQuery = "SELECT records.id AS record_id, " +
            "(SELECT quadrants_full.code " +
            " FROM geodata.quadrants_full " +
            " WHERE st_within(records.coords_wgs, quadrants_full.geom_wgs) LIMIT 1) AS computed_quadrant_code " +
            "FROM atlas.records AS records " +
            "WHERE records.id IN (:ids)";

        for (int start = 0; start < ids.size(); start += SEARCH_RESULTS_BATCH_SIZE) {
            int end = Math.min(start + SEARCH_RESULTS_BATCH_SIZE, ids.size());
            List<Long> idsBatch = ids.subList(start, end);
            List<SqlRow> rows = DB.sqlQuery(sqlQuery)
                .setParameter("ids", idsBatch)
                .findList();

            for (SqlRow row : rows) {
                Long recordId = row.getLong("record_id");
                String computedQuadrantCode = row.getString("computed_quadrant_code");
                if (recordId != null) {
                    quadrantCodesByRecordId.put(recordId, computedQuadrantCode);
                }
            }
        }

        return quadrantCodesByRecordId;
    }

    private PageSearchResults getExcelResults(List<Long> recordIds, Integer totalCount) {
        List<PageSearchResults.Row> resultRows = getSearchResults(recordIds);
        return new PageSearchResults(resultRows, List.of(), totalCount);
    }

    private Integer getTotalCountRecords(String fromClause, SearchFilterContext filterContext) throws Exception {
        String query = buildQuery(fromClause, filterContext.whereClause, null, true, 0, 0);
        SqlQuery countQuery = DB.sqlQuery(query);
        filterContext.parameters.applyTo(countQuery);
        SqlRow row = countQuery.findOne();

        if (row == null) {
            return 0;
        }

        Integer totalCount = row.getInteger("total_count");
        return totalCount;
    }

    private String buildQuery(String fromClause, String whereClause, String orderClause,
                              boolean get_total, int limit, int offset) throws Exception {
        String selectClause = get_total ? "COUNT(*) AS total_count" : "R.id";
        return buildSelectQuery(selectClause, fromClause, whereClause, orderClause, limit, offset);
    }

    private String buildSelectQuery(String selectClause, String fromClause, String whereClause,
                                    String orderClause, int limit, int offset) {
        StringBuilder queryBuilder = new StringBuilder();

        queryBuilder.append("SELECT ").append(selectClause).append(" ");

        queryBuilder.append(fromClause);
        queryBuilder.append(whereClause);
        if (orderClause != null && !orderClause.equals("")) {
            queryBuilder.append(orderClause);
        }

        if (limit > 0) {
            queryBuilder.append(" LIMIT ").append(limit);
            queryBuilder.append(" OFFSET ").append(offset);
        }

        return queryBuilder.toString();
    }

    private static class SearchFilterContext {
        private final String whereClause;
        private final QueryParameters parameters;

        private SearchFilterContext(String whereClause, QueryParameters parameters) {
            this.whereClause = whereClause;
            this.parameters = parameters;
        }
    }

    /**
     * Sbírá pojmenované parametry dotazu při stavbě WHERE klauzule, aby se všechny
     * hodnoty (zejména textové vstupy z vyhledávacího formuláře) vázaly přes
     * PreparedStatement a nikdy se nekonkatenovaly přímo do SQL textu
     * (prevence SQL injection).
     */
    static class QueryParameters {
        private final Map<String, Object> parameters = new LinkedHashMap<>();

        /**
         * Zaregistruje hodnotu pod unikátním názvem a vrátí placeholder
         * {@code :name} k vložení do stavěného SQL.
         */
        String bind(String name, Object value) {
            if (parameters.containsKey(name)) {
                throw new IllegalStateException("Duplicate query parameter '" + name + "'");
            }
            parameters.put(name, value);
            return ":" + name;
        }

        Map<String, Object> asMap() {
            return parameters;
        }

        void applyTo(SqlQuery query) {
            for (Map.Entry<String, Object> entry : parameters.entrySet()) {
                query.setParameter(entry.getKey(), entry.getValue());
            }
        }
    }

    private String getOrderByClause(SearchController.SearchForm form) {
        String sortBy = StringUtils.trimToNull(form.sortBy);
        String sortOrder = StringUtils.trimToNull(form.sortOrder);
        String direction = "desc".equalsIgnoreCase(sortOrder) ? "desc" : "asc";
        String collate = "COLLATE cs_cz_icu";

        if (StringUtils.isBlank(sortBy)) {
            return " ORDER BY T.name_lat, R.datum, R.id ";
        }

        String sortField = null;
        switch (sortBy) {
            case "taxonName":
                sortField = "T.name_lat";
                break;
            case "locality":
                sortField = "R.locality";
                break;
            case "nearestTownName":
                sortField = "CASE " +
                    "WHEN R.nearest_town_text IS NOT NULL THEN R.nearest_town_text " +
                    "WHEN R.nearest_town_id IS NOT NULL THEN (SELECT name FROM geodata.districts WHERE districts.id = R.nearest_town_id) " +
                    "ELSE (SELECT name FROM geodata.districts WHERE depth = 4 AND st_intersects(R.coords_wgs, districts.geom_wgs) LIMIT 1) " +
                    "END";
                break;
            case "date":
                sortField = "R.datum";
                collate = "";
                break;
            case "validationStatus":
                sortField = "R.validation_status";
                collate = "";
                break;
            case "square":
                sortField = "(SELECT quadrants_full.code FROM geodata.quadrants_full " +
                    "WHERE st_intersects(R.coords_wgs, quadrants_full.geom_wgs) LIMIT 1)";
                break;
            case "phytochorion":
                sortField = "(substring(phyto_id, '^[0-9]+'))::int " + direction + ",substring(phyto_id, '[^0-9_].*$')";
                collate = "";
                break;
            default:
                sortField = "R.id";
                collate = "";
                break;
        }

        return " ORDER BY " + sortField + " " + collate + " " + direction + " ";
    }

    private String buildFromClause(User currentUser, SearchController.SearchForm form, boolean withSortJoins) {
        StringBuilder builder = new StringBuilder();

        builder.append(" FROM ");

        builder.append(Record.QualifiedTableName).append(" AS R ");
        builder.append(" INNER JOIN ").append(Taxon.QualifiedName).append(" AS T on R.taxon_id=T.id ");

        if (form.dateFromImported != null || form.dateToImported != null || form.committerId != -1 ||
            (isExcelExport(form) && !currentUser.isMapAdmin())) {
            builder.append(" INNER JOIN ").append(Batch.QualifiedTableName).append(" AS B ON R.batch_id=").append("B.id ");
        }
        if (StringUtils.isNotBlank(form.finderSurname) || StringUtils.isNotBlank(form.finderName)) {
            builder.append(" INNER JOIN ").append("atlas.records_authors").append(" AS RA ON R.id=RA.records_id ");
            builder.append(" INNER JOIN ").append(Author.QualifiedTableName).append(" AS A ON RA.authors_id=A.id ");
        }
        if (form.herbarium != null) {
            int herbariumId = form.herbarium;
            if (Herbarium.isValidHerbId(herbariumId) ||
                Herbarium.isAnyHerbariumId(herbariumId)) {
                innerJoinHerbariums(builder);
            }
        } else if (StringUtils.isNotBlank(form.herbariumText)) {
            innerJoinHerbariums(builder);
        }

        if (StringUtils.isNotBlank(form.institution)) {
            builder.append(" INNER JOIN ").append(Project.QualifiedTableName).append(" AS P ON R.project_id=P.id ");
            builder.append(" INNER JOIN ").append(Institution.QualifiedTableName).append(" AS I ON P.institution_id=I.id ");
        }
        if (configService.isNonVascular()) {
            builder.append(" INNER JOIN ").append("atlas_nonvascular.records_extension").append(" AS NVEXT ON R.id=NVEXT.record_id ");
        }
        if (withSortJoins) {
            addSortJoins(builder, form);
        }
        return builder.toString();
    }

    private void innerJoinHerbariums(StringBuilder builder) {
        builder.append(" INNER JOIN ").append("atlas.records_herbariums").append(" AS RH ON R.id=RH.records_id ");
        builder.append(" INNER JOIN ").append(Herbarium.QualifiedTableName).append(" AS H ON RH.herbariums_id=H.id ");
    }

    private void addSortJoins(StringBuilder builder, SearchController.SearchForm form) {
        if ("phytochorion".equals(form.sortBy)) {
            builder.append(" LEFT JOIN geodata.phytochorions on R.phytochorion_id = phytochorions.rowid ");
        }
    }

    String buildWhereClause(User currentUser, SearchController.SearchForm form, Set<QuadrantNew> quadrants, Set<MapSquareNew> squares, QueryParameters parameters) throws Exception {
        StringBuilder whereClause = new StringBuilder();
        whereClause.append(" WHERE TRUE AND R.taxon_id IS NOT NULL AND ");

        addTaxonFilter(form, whereClause, parameters);
        addExcelPermissionsFilter(form, currentUser, whereClause, parameters);
        addBasicTextFilters(form, whereClause, parameters);
        addAltitudeAndMapFilters(form, whereClause, parameters);
        addCommentsAndCommitterFilters(form, whereClause, parameters);
        addFinderAndSourceFilters(form, whereClause, parameters);
        addHerbariumFilters(form, whereClause, parameters);
        addDateAndProjectFilters(form, whereClause, parameters);
        addStatusAndHistoryFilters(form, whereClause, parameters);
        addImportAndEditDateFilters(form, whereClause, parameters);
        addCommentStateFilters(form, whereClause);
        addLicenseFilter(form, whereClause, parameters);
        addQuadrantsSquaresFilter(quadrants, squares, whereClause, parameters);
        addInstitutionFilter(form, whereClause, parameters);
        addPolygonWktFilter(form, whereClause, parameters);

        if (configService.isNonVascular()) {
            extendWhereClauseForNonVascular(form, whereClause, parameters);
        }

        whereClause.append(" TRUE ");
        return whereClause.toString();
    }

    private void addBasicTextFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (StringUtils.isNotBlank(form.taxon_name_original)) {
            String param = parameters.bind("taxonNameOriginal", SqlUtils.toRegex(form.taxon_name_original));
            whereClause.append(" lower(R.original_name) LIKE lower(")
                .append(param)
                .append(") AND ");
        }
        if (StringUtils.isNotBlank(form.town)) {
            String param = parameters.bind("town", SqlUtils.toRegex(form.town));
            whereClause.append(" lower(R.nearest_town_text) LIKE lower(")
                .append(param)
                .append(") AND ");
        }
        if (StringUtils.isNotBlank(form.locality_description)) {
            String[] localities = form.locality_description.split(" OR ");
            whereClause.append("( ");
            int localityIndex = 0;
            for (String locality : localities) {
                String param = parameters.bind("localityDescription" + localityIndex, SqlUtils.toRegex(locality));
                whereClause.append(" lower(R.locality) LIKE lower(").append(param).append(") OR ");
                localityIndex++;
            }
            whereClause.append(" FALSE ) AND ");
        }
        if (StringUtils.isNotBlank(form.locality_or_town)) {
            String wildcard = SqlUtils.toRegex(form.locality_or_town);
            String townParam = parameters.bind("localityOrTownTown", wildcard);
            String localityParam = parameters.bind("localityOrTownLocality", wildcard);
            whereClause.append("(")
                .append(" lower(R.nearest_town_text) LIKE lower(").append(townParam).append(") OR ")
                .append(" lower(R.locality) LIKE lower(").append(localityParam).append(")")
                .append(") AND ");
        }
        if (StringUtils.isNoneBlank(form.foreignId)) {
            String param = parameters.bind("foreignId", SqlUtils.toRegex(form.foreignId));
            whereClause.append("(")
                .append("R.original_id like ").append(param)
                .append(") AND ");
        }

        List<Integer> pladiasIds = form.getPladiasIdValues();
        if (!pladiasIds.isEmpty()) {
            String param = parameters.bind("pladiasIds", pladiasIds);
            whereClause.append("R.id IN (")
                .append(param)
                .append(") AND ");
        }
    }

    private void addAltitudeAndMapFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (form.altitude_min != null) {
            String param = parameters.bind("altitudeMin", form.altitude_min);
            whereClause.append(" R.altitude_min >= ").append(param).append(" AND ");
        }
        if (form.altitude_max != null) {
            String param = parameters.bind("altitudeMax", form.altitude_max);
            whereClause.append(" R.altitude_max <= ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.no_map_square_or_quadrant)) {
            whereClause.append(" NOT EXISTS (SELECT 1 FROM atlas.records_squares AS MS WHERE R.id = MS.records_id) AND ");
            whereClause.append(" NOT EXISTS (SELECT 1 FROM atlas.records_quadrants AS RQ WHERE R.id = RQ.records_id) AND ");
        }
        if (form.phytochorion != null) {
            String param = parameters.bind("phytochorion", form.phytochorion);
            whereClause.append(" R.phytochorion_id = ").append(param).append(" AND ");
        }
    }

    private void addCommentsAndCommitterFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (StringUtils.isNotBlank(form.comment)) {
            String param = parameters.bind("comment", SqlUtils.toRegex(form.comment));
            whereClause.append(" lower(R.comment) LIKE lower(").append(param).append(") AND ");
        }
        if (StringUtils.isNotBlank(form.pladias_comment)) {
            String param = parameters.bind("pladiasComment", SqlUtils.toRegex(form.pladias_comment));
            whereClause.append("EXISTS (SELECT id FROM ").append(RecordComment.QualifiedTableName)
                .append(" AS RC WHERE R.id = RC.record_id AND RC.deleted = false ")
                .append(" AND lower(RC.message) LIKE lower(")
                .append(param)
                .append(")")
                .append(")) AND ");
        }
        if (form.committerId != null && form.committerId != -1) {
            String param = parameters.bind("committerId", form.committerId);
            whereClause.append(" B.committer_id = ").append(param).append(" AND ");
        }
    }

    private void addFinderAndSourceFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (StringUtils.isNotBlank(form.finderSurname)) {
            String[] finders = form.finderSurname.split(" OR ");
            whereClause.append("( ");
            int surnameIndex = 0;
            for (String finder : finders) {
                String param = parameters.bind("finderSurname" + surnameIndex, SqlUtils.toRegex(finder));
                whereClause.append(" lower(A.surname) LIKE lower(").append(param).append(") OR ");
                surnameIndex++;
            }
            whereClause.append(" FALSE ) AND ");
        }
        if (StringUtils.isNotBlank(form.finderName)) {
            String[] finders = form.finderName.split(" OR ");
            whereClause.append("( ");
            int nameIndex = 0;
            for (String finder : finders) {
                String param = parameters.bind("finderName" + nameIndex, SqlUtils.toRegex(finder));
                whereClause.append(" lower(A.name) LIKE lower(").append(param).append(") OR ");
                nameIndex++;
            }
            whereClause.append(" FALSE ) AND ");
        }
        if (StringUtils.isNotBlank(form.source)) {
            String param = parameters.bind("source", SqlUtils.toRegex(form.source));
            whereClause.append(" lower(R.source) LIKE lower(").append(param).append(") AND ");
        }
    }

    private void addHerbariumFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (form.herbarium != null) {
            int herbariumId = form.herbarium;
            if (Herbarium.isValidHerbId(herbariumId)) {
                String param = parameters.bind("herbariumId", herbariumId);
                whereClause.append(" H.id = ").append(param).append(" AND ");
            } else if (Herbarium.isNonHerbariumId(herbariumId)) {
                whereClause.append(" NOT EXISTS (SELECT 1 FROM ").append(Herbarium.QualifiedTableName).append(" AS H1 ")
                    .append(" INNER JOIN ").append("atlas.records_herbariums AS RH1 ")
                    .append(" ON H1.id=RH1.herbariums_id ")
                    .append(" WHERE R.id=RH1.records_id) AND ");
            }
        } else if (StringUtils.isNotBlank(form.herbariumText)) {
            String param = parameters.bind("herbariumText", SqlUtils.toRegex(form.herbariumText));
            whereClause.append("lower(H.name) like lower(")
                .append(param)
                .append(") AND ");
        }
    }

    private void addDateAndProjectFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (form.minYear != null) {
            String param = parameters.bind("minYearDate", java.sql.Date.valueOf(String.format("%d-01-01", form.minYear)));
            whereClause.append(" datum >= ").append(param).append(" AND ");
        }
        if (form.maxYear != null) {
            String param = parameters.bind("maxYearDate", java.sql.Date.valueOf(String.format("%d-12-31", form.maxYear)));
            whereClause.append(" datum <= ").append(param).append(" AND ");
        }
        if (form.buffer != null) {
            String param = parameters.bind("buffer", form.buffer);
            whereClause.append(" gps_coords_precision >= ").append(param).append(" AND ");
        }
        if (form.projects.length > 0) {
            String param = parameters.bind("projectIds", Arrays.asList(form.projects));
            whereClause.append(" R.project_id IN (").append(param).append(") AND ");
        }
    }

    private void addStatusAndHistoryFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (StringUtils.isNotBlank(form.validationStatus)) {
            int value = Integer.parseInt(form.validationStatus);
            if (value > -1) {
                String param = parameters.bind("validationStatus", value);
                whereClause.append("R.validation_status =").append(param).append(" AND ");
            }
        }
        if (StringUtils.isNotBlank(form.historyFlag)) {
            String param = parameters.bind("historyFlag", form.historyFlag);
            whereClause.append(" EXISTS (SELECT 1 FROM ").append(RecordHistory.QualifiedTableName).append(" AS RH WHERE ")
                .append("RH.record_id = R.id AND field_desc=").append(param).append(") AND ");
        }
    }

    private void addImportAndEditDateFilters(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (form.dateFromImported != null) {
            LocalDate d = LocalDate.fromDateFields(form.dateFromImported);
            String strDate = String.format("%d-%02d-%02d", d.getYear(), d.getMonthOfYear(), d.getDayOfMonth());
            String param = parameters.bind("dateFromImported", java.sql.Date.valueOf(strDate));
            whereClause.append(" B.creation_timestamp >= ").append(param).append(" AND ");
        }
        if (form.dateToImported != null) {
            LocalDate d = LocalDate.fromDateFields(form.dateToImported).plusDays(1);
            String strDate = String.format("%d-%02d-%02d", d.getYear(), d.getMonthOfYear(), d.getDayOfMonth());
            String param = parameters.bind("dateToImported", java.sql.Date.valueOf(strDate));
            whereClause.append(" B.creation_timestamp <= ").append(param).append(" AND ");
        }
        if (form.dateFromLastEdit != null || form.dateToLastEdit != null) {
            String subquery = createLastEditSubquery(form, parameters);
            whereClause.append("R.id IN ").append("(").append(subquery).append(") AND ");
        }
    }

    private String createLastEditSubquery(SearchController.SearchForm form, QueryParameters parameters) {
        String filter = createLastEditFilter(form, parameters);
        String sql = String.format("SELECT distinct record_id  FROM %s WHERE %s", RecordHistory.QualifiedTableName, filter);
        return sql;

    }

    private String createLastEditFilter(SearchController.SearchForm form, QueryParameters parameters) {
        StringBuilder filter = new StringBuilder("1=1");
        if (form.dateFromLastEdit != null) {
            LocalDate fromDate = LocalDate.fromDateFields(form.dateFromLastEdit);
            String param = parameters.bind("dateFromLastEdit", java.sql.Date.valueOf(fromDate.toString("yyyy-MM-dd")));
            filter.append(" AND ").append("creation_timestamp >= ").append(param);
        }
        if (form.dateToLastEdit != null) {
            LocalDate toDate = LocalDate.fromDateFields(form.dateToLastEdit).plusDays(1);
            String param = parameters.bind("dateToLastEdit", java.sql.Date.valueOf(toDate.toString("yyyy-MM-dd")));
            filter.append(" AND ").append("creation_timestamp <= ").append(param);
        }
        return filter.toString();
    }

    private void addCommentStateFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (form.commented != null) {
            whereClause.append("EXISTS (SELECT id FROM ").append(RecordComment.QualifiedTableName)
                .append(" AS RC WHERE ").append("R.id = RC.record_id AND RC.deleted = false) AND ");
        }
        if (form.unresolvedComment != null) {
            whereClause.append("EXISTS (SELECT id FROM ").append(RecordComment.QualifiedTableName)
                .append(" AS RC WHERE ").append("R.id = RC.record_id AND RC.resolved = false AND RC.deleted = false) AND ");
        }
    }

    private void addLicenseFilter(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (form.license != null) {
            String param = parameters.bind("licenseId", form.license);
            whereClause.append(" R.license_id = ").append(param).append(" AND ");
        }
    }

    private void addQuadrantsSquaresFilter(Set<QuadrantNew> quadrants, Set<MapSquareNew> squares, StringBuilder whereClause, QueryParameters parameters) {
        if (quadrants == null && squares == null) {
            return;
        }
        boolean are_both = quadrants != null && squares != null;
        whereClause.append(" (");
        if (quadrants != null) {
            List<Integer> quadrantIds = quadrants.stream()
                .map(QuadrantNew::getId)
                .collect(Collectors.toList());
            add_polygon_subquery(whereClause, QuadrantNew.QualifiedTableName, parameters.bind("quadrantIds", quadrantIds));
        }
        if (are_both) {
            whereClause.append(" OR ");
        }
        if (squares != null) {
            List<Integer> squareIds = squares.stream()
                .map(MapSquareNew::getId)
                .collect(Collectors.toList());
            add_polygon_subquery(whereClause, MapSquareNew.QualifiedTableName, parameters.bind("squareIds", squareIds));
        }
        whereClause.append(") AND ");
    }

    private void add_polygon_subquery(StringBuilder whereClause, String table_name, String paramPlaceholder) {
        whereClause.append(" EXISTS ( SELECT 1 FROM ")
            .append(table_name)
            .append(" p WHERE p.id IN (");
        whereClause.append(paramPlaceholder);
        whereClause.append(") AND ST_Contains(p.geom_wgs, R.coords_wgs))");
    }

    private boolean isExcelExport(SearchController.SearchForm searchForm) {
        return SearchController.SearchForm.ExportTypeExcel.equals(searchForm.export_type);
    }

    private void addTaxonFilter(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) throws Exception {
        List<Taxon> searchTaxa = null;

        if (StringUtils.isNotBlank(form.taxon_name)) {
            List<String> taxonNames = form.getTaxonNameValues();
            if (taxonNames.isEmpty()) {
                // samé oddělovače – jako dřív neexistující název (fail-safe,
                // vyhledávání skončí prázdným výsledkem)
                throw new Exception("Invalid taxon name");
            }
            // vícenásobný výběr: taxony všech názvů (každý případně rozbalený
            // o podtaxony přes include_subtaxa) sdílejí jednu společnou
            // podmínku IN – mezi vybranými taxony je OR
            searchTaxa = new ArrayList<>();
            for (String taxonName : taxonNames) {
                Taxon selectedTaxon = Taxon.find().query().where().ieq("nameLat", taxonName).findOne();
                if (selectedTaxon == null) {
                    throw new Exception("Invalid taxon name");
                }
                if (form.getInclude_subtaxa()) {
                    searchTaxa.addAll(Taxon.find().query().where()
                        .ge("lft", selectedTaxon.getLeft()).le("rgt", selectedTaxon.getRight()).findList());
                } else {
                    searchTaxa.add(selectedTaxon);
                }
            }
        }

        if (searchTaxa != null) {
            // vybrané taxony i podtaxony se mohou překrývat – deduplikace id
            List<Long> taxonIds = searchTaxa.stream()
                .map(Taxon::getId)
                .distinct()
                .collect(Collectors.toList());
            if (taxonIds.size() == 1) {
                String param = parameters.bind("taxonId", taxonIds.getFirst());
                whereClause.append(" R.taxon_id=").append(param).append(" AND ");
            } else {
                String param = parameters.bind("taxonIds", taxonIds);
                whereClause.append(" R.taxon_id IN (").append(param).append(") AND ");
            }
        }
    }

    private void addInstitutionFilter(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (StringUtils.isNotBlank(form.institution)) {
            // I.id je numerické – text neumíme porovnat, nečíselná hodnota selže explicitně při parsování
            String param = parameters.bind("institutionId", Integer.parseInt(form.institution.trim()));
            whereClause.append(" I.id = ").append(param).append(" AND ");
        }
    }

    /**
     * Uživatelem nakreslený polygon (WKT, SRID 4326) – záznamy, jejichž souřadnice
     * protínají polygon. Validaci tvaru dělá frontend (uzavřený prstenec);
     * nevalidní WKT selže na DB a vyhledávání skončí prázdným výsledkem.
     */
    private void addPolygonWktFilter(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (StringUtils.isNotBlank(form.polygonWkt)) {
            String param = parameters.bind("polygonWkt", form.polygonWkt.trim());
            whereClause.append(" ST_Intersects(ST_GeomFromText(").append(param).append(", 4326), R.coords_wgs) AND ");
        }
    }

    private void addExcelPermissionsFilter(SearchController.SearchForm form, User currentUser, StringBuilder whereClause, QueryParameters parameters) throws Exception {
        if (isExcelExport(form) && !currentUser.isMapAdmin()) {
            List<License> commonLicenses = LicenseDictionary.getInstance().getCreativeCommonLicenses();
            List<Integer> commonLicenseIds = commonLicenses
                .stream()
                .map(License::getId)
                .collect(Collectors.toList());

            whereClause.append("( EXISTS (SELECT 1 from atlas.taxons_users as TU1 ")
                .append("          INNER JOIN public.taxons as T1 on TU1.taxons_id = T1.id ")
                .append("          WHERE TU1.users_id = ").append(parameters.bind("excelUserIdTaxons", currentUser.getId()))
                .append(" AND T.lft >= T1.lft AND T.rgt <= T1.rgt")
                .append("         ) ")
                .append("  OR B.committer_id = ").append(parameters.bind("excelCommitterId", currentUser.getId()))
                .append("  OR R.license_id  IN (").append(parameters.bind("commonLicenseIds", commonLicenseIds)).append(") ")
                .append(") ")
                .append(" AND ");
        }
    }

    private void extendWhereClauseForNonVascular(SearchController.SearchForm form, StringBuilder whereClause, QueryParameters parameters) {
        if (StringUtils.isNotBlank(form.substrateText)) {
            String param = parameters.bind("substrateText", SqlUtils.toRegex(form.substrateText));
            whereClause.append(" NVEXT.substrate ILIKE ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.substrate1)) {
            String param = parameters.bind("substrate1Id", Integer.parseInt(form.substrate1.trim()));
            whereClause.append(" NVEXT.substrate_1_id = ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.substrate2)) {
            String param = parameters.bind("substrate2Id", Integer.parseInt(form.substrate2.trim()));
            whereClause.append(" NVEXT.substrate_2_id = ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.chemicalData)) {
            String param = parameters.bind("chemicalData", SqlUtils.toRegex(form.chemicalData));
            whereClause.append(" NVEXT.chemical ILIKE ").append(param).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.localityExtra)) {
            String param = parameters.bind("localityExtra", SqlUtils.toRegex(form.localityExtra));
            whereClause.append(" NVEXT.locality_extra ILIKE ").append(param).append(" AND ");
        }
    }

    private List<PageSearchResults.Row> getSearchResults(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }

        String sqlQuery =
            "SELECT " +
                "   records.id AS recordId, " +
                "   taxons_clear.name_lat AS taxonName, " +
                "   records.original_name AS taxonNameOriginal, " +
                "   records.locality AS locality, " +
                "   CASE " +
                "       WHEN records.nearest_town_text IS NOT NULL " +
                "           THEN records.nearest_town_text " +
                "       WHEN records.nearest_town_id IS NOT NULL " +
                "           THEN (SELECT name FROM geodata.districts WHERE districts.id = records.nearest_town_id) " +
                "       ELSE ( " +
                "           SELECT name " +
                "           FROM geodata.districts " +
                "           WHERE depth = 4 AND st_intersects(records.coords_wgs, districts.geom_wgs) LIMIT 1) " +
                "       END AS nearestTownName, " +
                "   districts.name AS districtName, " +
                "   CASE " +
                "       WHEN records.altitude_min IS NULL " +
                "           THEN records.altitude_max::text " +
                "       WHEN records.altitude_max IS NULL OR records.altitude_min = records.altitude_max " +
                "           THEN records.altitude_min::text " +
                "       ELSE records.altitude_min::text || '-' || records.altitude_max::text " +
                "   END AS altitude, " +
                "   records.latitude AS latitude, " +
                "   records.longitude AS longitude, " +
                "   records.gps_coords_source AS gpsCoordsSource, " +
                "   records.gps_coords_precision AS gpsCoordsPrecision, " +
                "   CASE " +
                "       WHEN records.datum_precision = 'Y' " +
                "           THEN to_char(records.datum, 'YYYY') " +
                "       WHEN records.datum_precision = 'M' " +
                "           THEN to_char(records.datum, 'YYYY-MM') " +
                "       ELSE to_char(records.datum, 'YYYY-MM-DD') " +
                "   END AS datum, " +
                "   (" +
                "       SELECT STRING_AGG(CASE " +
                "           WHEN name IS NULL OR name = '' THEN surname " +
                "           ELSE name || ' ' || surname END, '; ' ORDER BY succession) " +
                "       FROM atlas.records_authors " +
                "           INNER JOIN atlas.authors ON authors.id = records_authors.authors_id " +
                "           WHERE records_id = records.id) AS authors, " +
                "   records.source, " +
                "   (" +
                "       SELECT STRING_AGG(herbariums.name, '; ') " +
                "       FROM atlas.records_herbariums " +
                "           INNER JOIN atlas.herbariums ON herbariums.id = records_herbariums.herbariums_id " +
                "       WHERE records_id = records.id) AS herbaria, " +
                "   phytochorions.phyto_id || '. ' || phytochorions.name AS phytochorion, " +
                "   (" +
                "       SELECT quadrants_full.code " +
                "       FROM geodata.quadrants_full " +
                "       WHERE st_within(records.coords_wgs, quadrants_full.geom_wgs) LIMIT 1) AS quadrant, " +
                "   records.comment, " +
                "   record_validation_status.description AS validationStatus, " +
                "   record_originality_status.name_cz AS originality, " +
                "   projects.name AS project, " +
                "   records.original_id AS externalId, " +
                "   licenses.key AS license, " +
                "   users.surname || ', ' || users.name AS committer " +
                "FROM atlas.records " +
                "   LEFT JOIN public.taxons_clear on records.taxon_id = taxons_clear.id " +
                "   LEFT JOIN geodata.districts on records.district_id = districts.id " +
                "   LEFT JOIN geodata.phytochorions on records.phytochorion_id = phytochorions.rowid " +
                "   LEFT JOIN atlas.record_validation_status on records.validation_status = record_validation_status.id " +
                "   LEFT JOIN atlas.record_originality_status on records.originality_id = record_originality_status.id " +
                "   LEFT JOIN atlas.projects on records.project_id = projects.id " +
                "   LEFT JOIN public.licenses on records.license_id = licenses.id " +
                "   LEFT JOIN atlas.batch on records.batch_id = batch.id " +
                "   LEFT JOIN public.users on batch.committer_id = users.id " +
                "WHERE records.id IN (:ids) " +
                "ORDER BY records.id";

        List<PageSearchResults.Row> result = new ArrayList<>();
        for (int start = 0; start < ids.size(); start += SEARCH_RESULTS_BATCH_SIZE) {
            int end = Math.min(start + SEARCH_RESULTS_BATCH_SIZE, ids.size());
            List<Long> idsBatch = ids.subList(start, end);
            List<SqlRow> rows = DB.sqlQuery(sqlQuery)
                .setParameter("ids", idsBatch)
                .findList();

            for (SqlRow row : rows) {
                Double latitude = row.getDouble("latitude");
                Double longitude = row.getDouble("longitude");
                Integer gpsCoordsPrecision = row.getInteger("gpsCoordsPrecision");

                result.add(new PageSearchResults.Row(
                    row.getLong("recordId"),
                    row.getString("taxonName"),
                    row.getString("taxonNameOriginal"),
                    row.getString("locality"),
                    row.getString("nearestTownName"),
                    row.getString("altitude"),
                    row.getString("districtName"),
                    latitude != null ? latitude : 0.0,
                    longitude != null ? longitude : 0.0,
                    row.getString("gpsCoordsSource"),
                    gpsCoordsPrecision,
                    row.getString("datum"),
                    row.getString("authors"),
                    row.getString("source"),
                    row.getString("herbaria"),
                    row.getString("quadrant"),
                    row.getString("phytochorion"),
                    row.getString("comment"),
                    row.getString("validationStatus"),
                    row.getString("originality"),
                    row.getString("project"),
                    row.getString("externalId"),
                    row.getString("license"),
                    row.getString("committer")
                ));
            }
        }

        return result;
    }
}

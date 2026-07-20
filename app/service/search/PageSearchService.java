package service.search;

import com.google.inject.Inject;
import controllers.react.atlas.SearchController;
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
import utils.MapSquareResolver;
import utils.SqlUtils;

import java.util.*;
import java.util.stream.Collectors;

public class PageSearchService implements IPageSearchService {
    private static final int SEARCH_RESULTS_BATCH_SIZE = 10000;
    private static final Logger logger = LoggerFactory.getLogger(PageSearchService.class);
    private static ISquareRepository squareRepository;
    private MapSquareResolver.SquareData squareData;
    private final IConfigService configService;

    @Inject
    public PageSearchService(ISquareRepository repository, IConfigService configService) {
        squareRepository = repository;
        this.configService = configService;
    }

    @Override
    public PageSearchResults search(User currentUser, SearchController.SearchForm form,
                                    int page, int pageSize, boolean getTotalCount) {
        try {
            squareData = getSquareData(form);
            Set<QuadrantNew> quadrants = squareData != null ? squareData.quadrants : null;
            Set<MapSquareNew> squares = squareData != null ? squareData.squares : null;

            String whereClause = buildWhereClause(currentUser, form, quadrants, squares);

            Integer totalCount = null;
            if (getTotalCount) {
                String totalFromClause = buildFromClause(currentUser, form, false);
                totalCount = getTotalCountRecords(totalFromClause, whereClause);
            }

            String fromClause = buildFromClause(currentUser, form, true);
            String orderClause = getOrderByClause(form);
            List<Long> recordIds = getRecordIds(fromClause, whereClause, orderClause, page, pageSize);

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

    private List<Long> getRecordIds(String fromClause, String whereClause, String orderClause,
                                    int page, int pageSize) throws Exception {
        int offset = (page - 1) * pageSize;
        String query = buildQuery(fromClause, whereClause, orderClause, false, pageSize, offset);
        List<SqlRow> rows = DB.sqlQuery(query).findList();
        List<Long> recordIds = rows.stream()
            .map(row -> row.getLong("id"))
            .filter(id -> id != null)
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
        for (Record record : foundRecords) {
            String computedQuadrantCode = computedQuadrantCodes.get(record.getId());
            String computedSquareCode = null;
            if (computedQuadrantCode != null && computedQuadrantCode.length() > 1) {
                computedSquareCode = computedQuadrantCode.substring(0, computedQuadrantCode.length() - 1);
            }
            RecordPladiasDto dto = RecordPladiasDto.fromRecord(record, currentUser, computedQuadrantCode, computedSquareCode, disableEditing);
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

    private Integer getTotalCountRecords(String fromClause, String whereClause) throws Exception {
        String query = buildQuery(fromClause, whereClause, null, true, 0, 0);
        SqlQuery countQuery = DB.sqlQuery(query);
        SqlRow row = countQuery.findOne();

        if (row == null) {
            return 0;
        }

        Integer totalCount = row.getInteger("total_count");
        return totalCount;
    }

    private String buildQuery(String fromClause, String whereClause, String orderClause,
                              boolean get_total, int limit, int offset) throws Exception {
        StringBuilder queryBuilder = new StringBuilder();

        if (get_total) {
            queryBuilder.append("SELECT COUNT(*) AS total_count ");
        } else {
            queryBuilder.append("SELECT R.id ");
        }

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
                sortField = null;
                break;
        }

        if (StringUtils.isBlank(sortField)) {
            return " ORDER BY T.name_lat COLLATE cs_cz_icu, R.datum, R.id ";
        }

        return " ORDER BY " + sortField + " " + collate + " " + direction + ", T.name_lat COLLATE cs_cz_icu, R.datum, R.id ";
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

    private String buildWhereClause(User currentUser, SearchController.SearchForm form, Set<QuadrantNew> quadrants, Set<MapSquareNew> squares) throws Exception {
        StringBuilder whereClause = new StringBuilder();
        whereClause.append(" WHERE TRUE AND R.taxon_id IS NOT NULL AND ");

        addTaxonFilter(form, whereClause);
        addExcelPermissionsFilter(form, currentUser, whereClause);
        addBasicTextFilters(form, whereClause);
        addAltitudeAndMapFilters(form, whereClause);
        addCommentsAndCommitterFilters(form, whereClause);
        addFinderAndSourceFilters(form, whereClause);
        addHerbariumFilters(form, whereClause);
        addDateAndProjectFilters(form, whereClause);
        addStatusAndHistoryFilters(form, whereClause);
        addImportAndEditDateFilters(form, whereClause);
        addCommentStateFilters(form, whereClause);
        addLicenseFilter(form, whereClause);
        addQuadrantsSquaresFilter(quadrants, squares, whereClause);
        addInstitutionFilter(form, whereClause);

        if (configService.isNonVascular()) {
            extendWhereClauseForNonVascular(form, whereClause);
        }

        whereClause.append(" TRUE ");
        return whereClause.toString();
    }

    private void addBasicTextFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (StringUtils.isNotBlank(form.taxon_name_original)) {
            whereClause.append(" lower(R.original_name) LIKE lower('")
                .append(SqlUtils.toRegex(form.taxon_name_original))
                .append("') AND ");
        }
        if (StringUtils.isNotBlank(form.town)) {
            whereClause.append(" lower(R.nearest_town_text) LIKE lower('")
                .append(SqlUtils.toRegex(form.town))
                .append("') AND ");
        }
        if (StringUtils.isNotBlank(form.locality_description)) {
            String[] localities = form.locality_description.split(" OR ");
            whereClause.append("( ");
            for (String locality : localities) {
                locality = SqlUtils.sanitize(SqlUtils.toRegex(locality));
                whereClause.append(" lower(R.locality) LIKE lower('").append(locality).append("') OR ");
            }
            whereClause.append(" FALSE ) AND ");
        }
        if (StringUtils.isNotBlank(form.locality_or_town)) {
            String wildcard = SqlUtils.toRegex(form.locality_or_town);
            whereClause.append("(")
                .append(" lower(R.nearest_town_text) LIKE lower('").append(wildcard).append("') OR ")
                .append(" lower(R.locality) LIKE lower('").append(wildcard).append("')")
                .append(") AND ");
        }
        if (StringUtils.isNoneBlank(form.foreignId)) {
            String wildcard = SqlUtils.toRegex(form.foreignId);
            whereClause.append("(")
                .append("R.original_id like '").append(wildcard).append("'")
                .append(") AND ");
        }
    }

    private void addAltitudeAndMapFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (form.altitude_min != null) {
            whereClause.append(" R.altitude_min >= ").append(form.altitude_min).append(" AND ");
        }
        if (form.altitude_max != null) {
            whereClause.append(" R.altitude_max <= ").append(form.altitude_max).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.no_map_square_or_quadrant)) {
            whereClause.append(" NOT EXISTS (SELECT 1 FROM atlas.records_squares AS MS WHERE R.id = MS.records_id) AND ");
            whereClause.append(" NOT EXISTS (SELECT 1 FROM atlas.records_quadrants AS RQ WHERE R.id = RQ.records_id) AND ");
        }
        if (form.phytochorion != null) {
            whereClause.append(" R.phytochorion_id = ").append(form.phytochorion).append(" AND ");
        }
    }

    private void addCommentsAndCommitterFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (StringUtils.isNotBlank(form.comment)) {
            whereClause.append(" lower(R.comment) LIKE lower('").append(SqlUtils.toRegex(form.comment)).append("') AND ");
        }
        if (StringUtils.isNotBlank(form.pladias_comment)) {
            String sanitizedComment = SqlUtils.sanitize(SqlUtils.toRegex(form.pladias_comment));
            whereClause.append("EXISTS (SELECT id FROM ").append(RecordComment.QualifiedTableName)
                .append(" AS RC WHERE R.id = RC.record_id AND RC.deleted = false ")
                .append(" AND lower(RC.message) LIKE lower(")
                .append("'").append(sanitizedComment).append("'")
                .append(")) AND ");
        }
        if (form.committerId != -1) {
            whereClause.append(" B.committer_id = ").append(form.committerId).append(" AND ");
        }
    }

    private void addFinderAndSourceFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (StringUtils.isNotBlank(form.finderSurname)) {
            String[] finders = form.finderSurname.split(" OR ");
            whereClause.append("( ");
            for (String finder : finders) {
                finder = SqlUtils.sanitize(SqlUtils.toRegex(finder));
                whereClause.append(" lower(A.surname) LIKE lower('").append(SqlUtils.toRegex(finder)).append("') OR ");
            }
            whereClause.append(" FALSE ) AND ");
        }
        if (StringUtils.isNotBlank(form.finderName)) {
            String[] finders = form.finderName.split(" OR ");
            whereClause.append("( ");
            for (String finder : finders) {
                finder = SqlUtils.sanitize(SqlUtils.toRegex(finder));
                whereClause.append(" lower(A.name) LIKE lower('").append(SqlUtils.toRegex(finder)).append("') OR ");
            }
            whereClause.append(" FALSE ) AND ");
        }
        if (StringUtils.isNotBlank(form.source)) {
            whereClause.append(" lower(R.source) LIKE lower('").append(SqlUtils.toRegex(form.source)).append("') AND ");
        }
    }

    private void addHerbariumFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (form.herbarium != null) {
            int herbariumId = form.herbarium;
            if (Herbarium.isValidHerbId(herbariumId)) {
                whereClause.append(" H.id = ").append(herbariumId).append(" AND ");
            } else if (Herbarium.isNonHerbariumId(herbariumId)) {
                whereClause.append(" NOT EXISTS (SELECT 1 FROM ").append(Herbarium.QualifiedTableName).append(" AS H1 ")
                    .append(" INNER JOIN ").append("atlas.records_herbariums AS RH1 ")
                    .append(" ON H1.id=RH1.herbariums_id ")
                    .append(" WHERE R.id=RH1.records_id) AND ");
            }
        } else if (StringUtils.isNotBlank(form.herbariumText)) {
            whereClause.append("lower(H.name) like lower('")
                .append(SqlUtils.toRegex(form.herbariumText))
                .append("') AND ");
        }
    }

    private void addDateAndProjectFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (form.minYear != null) {
            whereClause.append(" datum >= '").append(form.minYear).append("-01-01' AND ");
        }
        if (form.maxYear != null) {
            whereClause.append(" datum <= '").append(form.maxYear).append("-12-31' AND ");
        }
        if (form.buffer != null) {
            whereClause.append(" gps_coords_precision >= ").append(form.buffer).append(" AND ");
        }
        if (form.projects.length > 0) {
            whereClause.append(" R.project_id  IN (");
            for (int p : form.projects) {
                whereClause.append(p).append(',');
            }
            whereClause.append(0).append(") AND ");
        }
    }

    private void addStatusAndHistoryFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (StringUtils.isNotBlank(form.validationStatus)) {
            int value = Integer.parseInt(form.validationStatus);
            if (value > -1) {
                whereClause.append("R.validation_status =").append(value).append(" AND ");
            }
        }
        if (StringUtils.isNotBlank(form.historyFlag)) {
            whereClause.append(" EXISTS (SELECT 1 FROM ").append(RecordHistory.QualifiedTableName).append(" AS RH WHERE ")
                .append("RH.record_id = R.id AND field_desc='").append(form.historyFlag).append("') AND ");
        }
    }

    private void addImportAndEditDateFilters(SearchController.SearchForm form, StringBuilder whereClause) {
        if (form.dateFromImported != null) {
            LocalDate d = LocalDate.fromDateFields(form.dateFromImported);
            String strDate = String.format("%d-%02d-%02d", d.getYear(), d.getMonthOfYear(), d.getDayOfMonth());
            whereClause.append(" B.creation_timestamp >= '").append(strDate).append("' AND ");
        }
        if (form.dateToImported != null) {
            LocalDate d = LocalDate.fromDateFields(form.dateToImported).plusDays(1);
            String strDate = String.format("%d-%02d-%02d", d.getYear(), d.getMonthOfYear(), d.getDayOfMonth());
            whereClause.append(" B.creation_timestamp <= '").append(strDate).append("' AND ");
        }
        if (form.dateFromLastEdit != null || form.dateToLastEdit != null) {
            String subquery = createLastEditSubquery(form);
            whereClause.append("R.id IN ").append("(").append(subquery).append(") AND ");
        }
    }

    private String createLastEditSubquery(SearchController.SearchForm form) {
        String filter = createLastEditFilter(form);
        String sql = String.format("SELECT distinct record_id  FROM %s WHERE %s", RecordHistory.QualifiedTableName, filter);
        return sql;

    }

    private String createLastEditFilter(SearchController.SearchForm form) {
        StringBuilder filter = new StringBuilder("1=1");
        if (form.dateFromLastEdit != null) {
            LocalDate fromDate = LocalDate.fromDateFields(form.dateFromLastEdit);
            filter.append(" AND ").append("creation_timestamp >= ").append("'").append(fromDate.toString("yyyy-MM-dd")).append("'");
        }
        if (form.dateToLastEdit != null) {
            LocalDate toDate = LocalDate.fromDateFields(form.dateToLastEdit).plusDays(1);
            filter.append(" AND ").append("creation_timestamp <= ").append("'").append(toDate.toString("yyyy-MM-dd")).append("'");
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

    private void addLicenseFilter(SearchController.SearchForm form, StringBuilder whereClause) {
        if (form.license != null) {
            whereClause.append(" R.license_id = ").append(form.license).append(" AND ");
        }
    }

    private void addQuadrantsSquaresFilter(Set<QuadrantNew> quadrants, Set<MapSquareNew> squares, StringBuilder whereClause) {
        if (quadrants == null && squares == null) {
            return;
        }
        boolean are_both = quadrants != null && squares != null;
        whereClause.append(" (");
        if (quadrants != null) {
            String quadrant_ids = quadrants.stream()
                .map(q -> String.valueOf(q.getId()))
                .collect(java.util.stream.Collectors.joining(","));
            add_polygon_subquery(whereClause, QuadrantNew.QualifiedTableName, quadrant_ids);
        }
        if (are_both) {
            whereClause.append(" OR ");
        }
        if (squares != null) {
            String square_ids = squares.stream()
                .map(s -> String.valueOf(s.getId()))
                .collect(java.util.stream.Collectors.joining(","));
            add_polygon_subquery(whereClause, MapSquareNew.QualifiedTableName, square_ids);
        }
        whereClause.append(") AND ");
    }

    private void add_polygon_subquery(StringBuilder whereClause, String table_name, String ids) {
        whereClause.append(" EXISTS ( SELECT 1 FROM ")
            .append(table_name)
            .append(" p WHERE p.id IN (");
        whereClause.append(ids);
        whereClause.append(") AND ST_Contains(p.geom_wgs, R.coords_wgs))");
    }

    private boolean isExcelExport(SearchController.SearchForm searchForm) {
        return SearchController.SearchForm.ExportTypeExcel.equals(searchForm.export_type);
    }

    private void addTaxonFilter(SearchController.SearchForm form, StringBuilder whereClause) throws Exception {
        Taxon selectedTaxon = null;
        List<Taxon> searchTaxa = null;

        if (StringUtils.isNotBlank(form.taxon_name)) {
            selectedTaxon = Taxon.find().query().where().ieq("nameLat", form.taxon_name.trim()).findOne();
            if (selectedTaxon == null) {
                throw new Exception("Invalid taxon name");
            }
            if (form.getInclude_subtaxa()) {
                searchTaxa = Taxon.find().query().where().ge("lft", selectedTaxon.getLeft()).le("rgt", selectedTaxon.getRight()).findList();
            } else {
                searchTaxa = List.of(selectedTaxon);
            }
        }

        if (searchTaxa != null) {
            if (searchTaxa.size() == 1) {
                whereClause.append(" R.taxon_id=").append(searchTaxa.get(0).getId()).append(" AND ");
            } else {
                StringBuilder builder = new StringBuilder();
                builder.append("(");
                for (Taxon t : searchTaxa) {
                    builder.append(t.getId()).append(',');
                }
                builder.append("-1)"); //-1 => unexisting taxon to simplify creation of the list
                whereClause.append(" R.taxon_id IN ").append(builder.toString()).append(" AND ");
            }
        }
    }

    private void addInstitutionFilter(SearchController.SearchForm form, StringBuilder whereClause) {
        if (StringUtils.isNotBlank(form.institution)) {
            whereClause.append(" I.id = '").append(form.institution).append("' AND ");
        }
    }

    private void addExcelPermissionsFilter(SearchController.SearchForm form, User currentUser, StringBuilder whereClause) throws Exception {
        if (isExcelExport(form) && !currentUser.isMapAdmin()) {
            List<License> commonLicenses = LicenseDictionary.getInstance().getCreativeCommonLicenses();
            String commaDelimitedCommonLicenseIds = commonLicenses
                .stream()
                .map(lic -> String.valueOf(lic.getId()))
                .collect(Collectors.joining(","));

            whereClause.append("( EXISTS (SELECT 1 from atlas.taxons_users as TU1 ")
                .append("          INNER JOIN public.taxons as T1 on TU1.taxons_id = T1.id ")
                .append("          WHERE TU1.users_id = ").append(currentUser.getId()).append(" AND T.lft >= T1.lft AND T.rgt <= T1.rgt")
                .append("         ) ")
                .append("  OR B.committer_id = ").append(currentUser.getId())
                .append("  OR R.license_id  IN (").append(commaDelimitedCommonLicenseIds).append(") ")
                .append(") ")
                .append(" AND ");
        }
    }

    private void extendWhereClauseForNonVascular(SearchController.SearchForm form, StringBuilder whereClause) {
        if (StringUtils.isNotBlank(form.substrateText)) {
            String substrateRegex = SqlUtils.toRegex(form.substrateText);
            whereClause.append(" NVEXT.substrate ILIKE '").append(substrateRegex).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.substrate1)) {
            whereClause.append(" NVEXT.substrate_1_id = ").append(form.substrate1).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.substrate2)) {
            whereClause.append(" NVEXT.substrate_2_id = ").append(form.substrate2).append(" AND ");
        }
        if (StringUtils.isNotBlank(form.chemicalData)) {
            String chemDataRegex = SqlUtils.toRegex(form.chemicalData);
            whereClause.append(" NVEXT.chemical ILIKE '").append(chemDataRegex).append("' AND ");
        }
        if (StringUtils.isNotBlank(form.localityExtra)) {
            String localityExtraRegex = SqlUtils.toRegex(form.localityExtra);
            whereClause.append(" NVEXT.locality_extra ILIKE '").append(localityExtraRegex).append("' AND ");
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

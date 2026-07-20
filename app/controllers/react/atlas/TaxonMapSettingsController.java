package controllers.react.atlas;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.TaxonMapSettingsDto;
import exceptions.NotEligibleException;
import io.ebean.DB;
import io.ebean.SqlQuery;
import io.ebean.SqlRow;
import models.*;
import org.apache.commons.lang3.StringEscapeUtils;
import org.apache.commons.lang3.StringUtils;
import play.data.Form;
import play.data.FormFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Http.Session;
import play.mvc.Result;
import play.mvc.Security;
import service.config.IConfigService;
import service.map.publication.PublicationUpdateService;
import service.map.revision.RevisionUpdateService;
import service.taxon.ITaxonService;
import service.taxonmapsettings.TaxonMapSettingsParentUpdateService;
import utils.JsonResult;
import utils.SessionUtils;

import javax.inject.Inject;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for managing TaxonMapSettings in the Atlas module.
 * Provides endpoints for retrieving taxa with their map settings.
 */
@Security.Authenticated(Authorized.class)
public class TaxonMapSettingsController extends ControllerBase {

    public static final String MapTypeKey = "MAPTYPE";
    public static final String RevisionStatusKey = "REVISIONSTATUS";
    public static final String PublicationStatusKey = "PUBLICATIONSTATUS";
    public static final String RevisorsCommentKey = "REVISORSCOMMENT";
    public static final String RevisorsPrintMapCommentKey = "REVISORSPRINTMAPCOMMENT";
    public static final String MapAdminCommentKey = "MAPADMINCOMMENT";
    public static final String IsMappedKey = "ISMAPPED";
    public static final String SetCommonThresholdKey = "SETCOMMONTHRESHOLD";
    public static final String PresliaKey = "PRESLIA";
    public static final String ProtectedKey = "PROTECTED";
    public static final String ParentMapKey = "PARENT_MAP";

    @Inject
    private FormFactory formFactory;

    @Inject
    private ITaxonService taxonService;

    @Inject
    private IConfigService configService;

    public Result updateMapSettings(Http.Request request) {
        try {
            Messages messages = getMessages(request);
            Form<UpdateMapSettingsForm> form = formFactory.form(UpdateMapSettingsForm.class).bindFromRequest(request);

            if (form.hasErrors()) {
                return ok(
                    JsonResult.error(messages.at("TaxonMapSettingsController.invalidInputParameters"))
                );
            }
            UpdateMapSettingsForm f = form.get();
            TaxonMapSettings settings = doUpdateMapSettings(request.session(), f.taxonId, f.timestamp, f.key, f.value);
            return ok(buildSuccessResponse(f.value, settings));
        } catch (Exception e) {
            return ok(JsonResult.error(e.getMessage()));
        }

    }

    private TaxonMapSettings doUpdateMapSettings(Session session, Long taxonId, Long timestamp, String key, String value) {
        TaxonMapSettings settings = TaxonMapSettings.find().byId(taxonId);
        Messages messages = getMessages(session);
        if (settings == null) {
            throw new IllegalArgumentException(messages.at("TaxonMapSettingsController.invalidTaxon"));
        }

        if (settings.getLastEditTimestamp() != null &&
            settings.getLastEditTimestamp().getTime() != timestamp) {
            String userMessage = messages.at("TaxonMapSettingsController.newerVersionExists");
            String logMessage = String.format(
                "Newer version exists: got timestamp %d, version in DB: %d",
                timestamp,
                settings.getLastEditTimestamp().getTime());
            throw new IllegalArgumentException(userMessage + "\n" + logMessage);
        }

        switch (key) {
            case MapTypeKey:
                handleMapType(messages, settings, value);
                break;
            case IsMappedKey:
                handleIsMapped(session, settings, value);
                break;
            case SetCommonThresholdKey:
                handleSetCommonThreshold(session, settings, value);
                break;
            case RevisionStatusKey:
                handleRevisionStatus(session, settings, value);
                break;
            case PublicationStatusKey:
                handleProductionStatus(session, settings, value);
                break;
            case RevisorsCommentKey:
                settings.setRevisorsComment(value);
                break;
            case RevisorsPrintMapCommentKey:
                settings.setRevisorsPrintMapComment(value);
                break;
            case MapAdminCommentKey:
                settings.setMapAdminComment(value);
                break;
            case PresliaKey:
                settings.setPreslia(value);
                break;
            case ProtectedKey:
                boolean isProtected = Boolean.parseBoolean(value);
                settings.setProtected(isProtected);
                break;
            case ParentMapKey:
                TaxonMapSettings parent = null;
                TaxonMapSettingsParentUpdateService service = new TaxonMapSettingsParentUpdateService(settings);

                if (StringUtils.isNotBlank(value)) {
                    parent = TaxonMapSettings.find().byId(Long.parseLong(value));
                    service.setParent(parent);
                    parent.update();
                } else {
                    service.removeParent();
                }
                break;
            default:
                throw new IllegalArgumentException(messages.at("TaxonMapSettingsController.invalidKey"));
        }
        settings.update();
        return settings;
    }

    private void handleIsMapped(Session session, TaxonMapSettings settings, String value) {
        verifyCurrentUserIsMapAdmin(session);
        Messages messages = getMessages(session);
        try {
            boolean v = Boolean.parseBoolean(value);
            settings.setMapped(v);
        } catch (Exception e) {
            throw new IllegalArgumentException(messages.at("TaxonMapSettingsController.invalidValue", value));
        }
    }

    private void handleSetCommonThreshold(Session session, TaxonMapSettings settings, String value) {
        verifyCurrentUserIsMapAdmin(session);
        Messages messages = getMessages(session);
        try {
            Integer threshold = Integer.parseInt(value);
            settings.setCommonThreshold(threshold);
        } catch (Exception e) {
            throw new IllegalArgumentException(messages.at("TaxonMapSettingsController.invalidValue", value));
        }
    }

    private void verifyCurrentUserIsMapAdmin(Session session) {
        User currentUser = SessionUtils.getCurrentUser(session);
        if (!currentUser.isMapAdmin()) {
            throw new SecurityException("TaxonMapSettingsController.userNotEligible");
        }
    }

    private void handleMapType(Messages messages, TaxonMapSettings settings, String value) {

        try {
            int v = Integer.parseInt(value);
            settings.setMapType(v);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(messages.at("TaxonMapSettingsController.invalidMapType"));
        }
    }

    private void handleProductionStatus(Session session, TaxonMapSettings settings, String value) {
        verifyCurrentUserIsMapAdmin(session);
        Messages messages = getMessages(session);
        try {
            int v = Integer.parseInt(value);
            User currentUser = SessionUtils.getCurrentUser(session);
            PublicationUpdateService service = new PublicationUpdateService(currentUser, taxonService, configService, messages);
            service.update(settings, v);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(messages.at("TaxonMapSettingsController.invalidStatus"));
        } catch (Exception e) {
            throw new IllegalArgumentException(e.getMessage());
        }
    }

    private void handleRevisionStatus(Session session, TaxonMapSettings settings, String value) {
        Messages messages = getMessages(session);
        try {
            int v = Integer.parseInt(value);
            User currentUser = SessionUtils.getCurrentUser(session);
            RevisionUpdateService service = new RevisionUpdateService(currentUser, taxonService, configService, messages);
            service.update(settings, v);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(messages.at("TaxonMapSettingsController.invalidRevisonStatus"));
        } catch (NotEligibleException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
    }

    /**
     * Get taxa with map settings for React datatable with filtering capabilities.
     * Only accessible by map admins.
     *
     * @param request HTTP request
     * @return JSON response with taxa and their map settings
     */
    public Result getTaxa(Http.Request request) {
        try {
            // Check if current user is map admin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isMapAdmin()) {
                return unauthorized(JsonResult.error("Unauthorized access - map admin required"));
            }

            // Get query parameters for filtering
            String nameLatFilter = request.getQueryString("nameLatFilter");
            String isMappedFilter = request.getQueryString("isMappedFilter");
            String commonThresholdFilter = request.getQueryString("commonThresholdFilter");
            String isProtectedFilter = request.getQueryString("isProtectedFilter");
            String presliaFilter = request.getQueryString("presliaFilter");
            String revisorsFilter = request.getQueryString("revisorsFilter");
            String revisionStatusFilter = request.getQueryString("revisionStatusFilter");
            String publicationStatusFilter = request.getQueryString("publicationStatusFilter");

            // Sorting parameters
            String sortField = request.getQueryString("sortField");
            String sortDirection = request.getQueryString("sortDirection");

            // Pagination parameters
            int page = request.getQueryString("page") != null ? Integer.parseInt(request.getQueryString("page")) : 1;
            int pageSize = request.getQueryString("pageSize") != null ? Integer.parseInt(request.getQueryString("pageSize")) : 20;

            // Build WHERE clause for filters using positional parameters
            StringBuilder whereClause = new StringBuilder();
            java.util.List<Object> params = new java.util.ArrayList<>();

            if (nameLatFilter != null && !nameLatFilter.isEmpty()) {
                whereClause.append(" AND t.name_lat ILIKE ?");
                params.add("%" + nameLatFilter + "%");
            }
            if (isMappedFilter != null && !isMappedFilter.isEmpty()) {
                whereClause.append(" AND ms.is_mapped = ?");
                params.add(Boolean.parseBoolean(isMappedFilter));
            }
            if (commonThresholdFilter != null && !commonThresholdFilter.isEmpty()) {
                whereClause.append(" AND ms.common_threshold = ?");
                params.add(Integer.parseInt(commonThresholdFilter));
            }
            if (isProtectedFilter != null && !isProtectedFilter.isEmpty()) {
                whereClause.append(" AND ms.is_protected = ?");
                params.add(Boolean.parseBoolean(isProtectedFilter));
            }
            if (presliaFilter != null && !presliaFilter.isEmpty()) {
                whereClause.append(" AND ms.preslia ILIKE ?");
                params.add("%" + presliaFilter + "%");
            }
            if (revisorsFilter != null && !revisorsFilter.isEmpty()) {
                whereClause.append(" AND ms.revisors_comment ILIKE ?");
                params.add("%" + revisorsFilter + "%");
            }
            if (revisionStatusFilter != null && !revisionStatusFilter.isEmpty()) {
                whereClause.append(" AND ms.revision_status = ?");
                params.add(Integer.parseInt(revisionStatusFilter));
            }
            if (publicationStatusFilter != null && !publicationStatusFilter.isEmpty()) {
                whereClause.append(" AND ms.publication_status = ?");
                params.add(Integer.parseInt(publicationStatusFilter));
            }

            // Calculate pagination
            int offset = (page - 1) * pageSize;

            // Build the main SQL query with JOIN to taxons table for ordering
            String sql = "SELECT ms.taxon_id, ms.map_type, ms.revision_status, ms.publication_status, " +
                "       ms.revisors_comment, ms.revisors_print_map_comment, ms.mapadmin_comment, " +
                "       ms.edit_timestamp, ms.is_mapped, ms.common_threshold, ms.is_protected, " +
                "       ms.edit_count, ms.locked, ms.superior_taxon, ms.preslia, " +
                "       t.name_lat, t.rank, " +
                "       pt.name_lat as parent_name_lat, pt.id as parent_taxon_id " +
                "FROM atlas.taxon_mapsettings ms " +
                "JOIN public.taxons_clear t ON t.id = ms.taxon_id " +
                "LEFT JOIN atlas.taxon_mapsettings pms ON ms.superior_taxon = pms.taxon_id " +
                "LEFT JOIN public.taxons_clear pt ON pms.taxon_id = pt.id " +
                "WHERE 1=1 " + whereClause + " " +
                "ORDER BY t.name_lat ASC NULLS LAST " +
                "LIMIT ? OFFSET ?";

            SqlQuery sqlQuery = DB.sqlQuery(sql);
            // Bind filter parameters
            for (Object param : params) {
                sqlQuery.setParameter(param);
            }
            // Bind pagination parameters
            sqlQuery.setParameter(pageSize);
            sqlQuery.setParameter(offset);

            java.util.List<SqlRow> rows = sqlQuery.findList();

            // Get filtered count
            String countSql = "SELECT COUNT(*) FROM atlas.taxon_mapsettings ms " +
                "JOIN public.taxons_clear t ON t.id = ms.taxon_id " +
                "WHERE 1=1 " + whereClause;
            SqlQuery countQuery = DB.sqlQuery(countSql);
            // Bind filter parameters (same as main query, without pagination)
            for (Object param : params) {
                countQuery.setParameter(param);
            }
            long filteredCount = countQuery.findOne().getLong("count");

            // Get total count of all taxa (without filters)
            long totalCount = TaxonMapSettings.find().query().findCount();

            // Convert to DTO format suitable for React datatable
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            ArrayNode taxaArray = mapper.createArrayNode();

            for (SqlRow row : rows) {
                Long taxonId = row.getLong("taxon_id");
                Integer mapType = row.getInteger("map_type");
                Taxon taxon = DB.reference(Taxon.class, taxonId);
                String revisors = taxonService.getInheritedRevisors(taxon).stream()
                    .map(u -> u.getName() + " " + u.getSurname())
                    .collect(Collectors.joining(", "));

                String taxonNameLat = row.getString("name_lat");
                Integer rankId = row.getInteger("rank");

                // Fetch taxon rank (CZ name)
                String taxonRankCz = "";
                if (rankId != null) {
                    TaxonRank rank = TaxonRank.find().byId(rankId);
                    if (rank != null && rank.getNameCz() != null) {
                        taxonRankCz = rank.getNameCz();
                    }
                }

                String preslia = row.getString("preslia") != null ? row.getString("preslia") : "";
                String revisorsComment = row.getString("revisors_comment") != null ? row.getString("revisors_comment") : "";
                String revisorsPrintComment = row.getString("revisors_print_map_comment") != null ? row.getString("revisors_print_map_comment") : "";

                // common_threshold: 0 means null in DB
                Integer commonThreshold = row.getInteger("common_threshold");
                if (commonThreshold != null && commonThreshold == 0) {
                    commonThreshold = null;
                }

                Integer revisionStatusId = row.getInteger("revision_status");
                String revisionStatusDescription = "";
                if (revisionStatusId != null) {
                    RevisionStatus rs = RevisionStatus.find().byId(revisionStatusId);
                    if (rs != null && rs.getDescription() != null) {
                        revisionStatusDescription = rs.getDescription();
                    }
                }

                Integer publicationStatusId = row.getInteger("publication_status");
                String publicationStatusDescription = "";
                if (publicationStatusId != null) {
                    PublicationStatus ps = PublicationStatus.find().byId(publicationStatusId);
                    if (ps != null && ps.getDescription() != null) {
                        publicationStatusDescription = ps.getDescription();
                    }
                }

                Long lastEditTimestamp = row.getTimestamp("edit_timestamp") != null ?
                    row.getTimestamp("edit_timestamp").getTime() : 0L;

                Long parentTaxonId = row.getLong("parent_taxon_id");
                String parentTaxonNameLat = row.getString("parent_name_lat");

                boolean currentUserIsRevisor = taxonService.getInheritedRevisors(taxon).contains(currentUser);
                TaxonMapSettingsDto dto = new TaxonMapSettingsDto(
                    taxonId,
                    taxonNameLat != null ? taxonNameLat : "",
                    taxonRankCz,
                    row.getBoolean("is_mapped"),
                    commonThreshold,
                    row.getBoolean("is_protected"),
                    preslia,
                    revisors,
                    revisorsPrintComment,
                    revisorsComment,
                    revisionStatusId != null ? revisionStatusId : 0,
                    revisionStatusDescription,
                    publicationStatusId != null ? publicationStatusId : 0,
                    publicationStatusDescription,
                    lastEditTimestamp,
                    parentTaxonId,
                    parentTaxonNameLat,
                    taxon.getCsvMapDetail() != null ? taxon.getCsvMapDetail().getId() : null,
                    taxon.getCsvMapDetail() != null ? taxon.getCsvMapDetail().getDatetime() : null,
                    taxon.pdfMapExists(),
                    currentUserIsRevisor,
                    mapType
                );
                taxaArray.add(mapper.valueToTree(dto));
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("taxa", taxaArray);
            response.put("filteredCount", filteredCount);
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            return internalServerError(JsonResult.error("An error occurred while retrieving taxa: " + e.getMessage()));
        }
    }

    /**
     * Get taxa with map settings for React datatable with filtering capabilities.
     * Only returns taxa where the current user is a supervisor (via atlas.taxons_users).
     *
     * @param request HTTP request
     * @return JSON response with taxa and their map settings
     */
    public Result getTaxaForUser(Http.Request request) {
        try {
            // Get current user
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null) {
                return unauthorized(JsonResult.error("Unauthorized access - user not logged in"));
            }

            // Get query parameters for filtering
            String nameLatFilter = request.getQueryString("nameLatFilter");
            String isMappedFilter = request.getQueryString("isMappedFilter");
            String commonThresholdFilter = request.getQueryString("commonThresholdFilter");
            String isProtectedFilter = request.getQueryString("isProtectedFilter");
            String presliaFilter = request.getQueryString("presliaFilter");
            String revisorsFilter = request.getQueryString("revisorsFilter");
            String revisionStatusFilter = request.getQueryString("revisionStatusFilter");
            String publicationStatusFilter = request.getQueryString("publicationStatusFilter");

            // Sorting parameters
            String sortField = request.getQueryString("sortField");
            String sortDirection = request.getQueryString("sortDirection");

            // Pagination parameters
            int page = request.getQueryString("page") != null ? Integer.parseInt(request.getQueryString("page")) : 1;
            int pageSize = request.getQueryString("pageSize") != null ? Integer.parseInt(request.getQueryString("pageSize")) : 20;

            // Build WHERE clause for filters using positional parameters
            StringBuilder whereClause = new StringBuilder();
            java.util.List<Object> params = new java.util.ArrayList<>();

            if (nameLatFilter != null && !nameLatFilter.isEmpty()) {
                whereClause.append(" AND t.name_lat ILIKE ?");
                params.add("%" + nameLatFilter + "%");
            }
            if (isMappedFilter != null && !isMappedFilter.isEmpty()) {
                whereClause.append(" AND ms.is_mapped = ?");
                params.add("1".equals(isMappedFilter) || "true".equalsIgnoreCase(isMappedFilter));
            }
            if (commonThresholdFilter != null && !commonThresholdFilter.isEmpty()) {
                whereClause.append(" AND ms.common_threshold = ?");
                params.add(Integer.parseInt(commonThresholdFilter));
            }
            if (isProtectedFilter != null && !isProtectedFilter.isEmpty()) {
                whereClause.append(" AND ms.is_protected = ?");
                params.add("1".equals(isProtectedFilter) || "true".equalsIgnoreCase(isProtectedFilter));
            }
            if (presliaFilter != null && !presliaFilter.isEmpty()) {
                whereClause.append(" AND ms.preslia ILIKE ?");
                params.add("%" + presliaFilter + "%");
            }
            if (revisorsFilter != null && !revisorsFilter.isEmpty()) {
                whereClause.append(" AND ms.revisors_comment ILIKE ?");
                params.add("%" + revisorsFilter + "%");
            }
            if (revisionStatusFilter != null && !revisionStatusFilter.isEmpty()) {
                whereClause.append(" AND ms.revision_status = ?");
                params.add(Integer.parseInt(revisionStatusFilter));
            }
            if (publicationStatusFilter != null && !publicationStatusFilter.isEmpty()) {
                whereClause.append(" AND ms.publication_status = ?");
                params.add(Integer.parseInt(publicationStatusFilter));
            }

            // Calculate pagination
            int offset = (page - 1) * pageSize;

            // Build the main SQL query with JOIN to taxons_users table to filter by current user
            String sql = "SELECT ms.taxon_id, ms.map_type, ms.revision_status, ms.publication_status, " +
                "       ms.revisors_comment, ms.revisors_print_map_comment, ms.mapadmin_comment, " +
                "       ms.edit_timestamp, ms.is_mapped, ms.common_threshold, ms.is_protected, " +
                "       ms.edit_count, ms.locked, ms.superior_taxon, ms.preslia, " +
                "       t.name_lat, t.rank, " +
                "       pt.name_lat as parent_name_lat, pt.id as parent_taxon_id " +
                "FROM atlas.taxon_mapsettings ms " +
                "JOIN public.taxons_clear t ON t.id = ms.taxon_id " +
                "JOIN atlas.taxons_users tu ON tu.taxons_id = t.id " +
                "LEFT JOIN atlas.taxon_mapsettings pms ON ms.superior_taxon = pms.taxon_id " +
                "LEFT JOIN public.taxons_clear pt ON pms.taxon_id = pt.id " +
                "WHERE tu.users_id = ? " + whereClause + " " +
                "ORDER BY t.name_lat ASC NULLS LAST " +
                "LIMIT ? OFFSET ?";

            SqlQuery sqlQuery = DB.sqlQuery(sql);
            // Bind user ID parameter first
            sqlQuery.setParameter(currentUser.getId());
            // Bind filter parameters
            for (Object param : params) {
                sqlQuery.setParameter(param);
            }
            // Bind pagination parameters
            sqlQuery.setParameter(pageSize);
            sqlQuery.setParameter(offset);

            java.util.List<SqlRow> rows = sqlQuery.findList();

            // Get filtered count
            String countSql = "SELECT COUNT(*) FROM atlas.taxon_mapsettings ms " +
                "JOIN public.taxons_clear t ON t.id = ms.taxon_id " +
                "JOIN atlas.taxons_users tu ON tu.taxons_id = t.id " +
                "WHERE tu.users_id = ? " + whereClause;
            SqlQuery countQuery = DB.sqlQuery(countSql);
            // Bind user ID parameter first
            countQuery.setParameter(currentUser.getId());
            // Bind filter parameters (same as main query, without pagination)
            for (Object param : params) {
                countQuery.setParameter(param);
            }
            long filteredCount = countQuery.findOne().getLong("count");

            // Get total count of all taxa for current user (without filters)
            String totalCountSql = "SELECT COUNT(*) FROM atlas.taxon_mapsettings ms " +
                "JOIN atlas.taxons_users tu ON tu.taxons_id = ms.taxon_id " +
                "WHERE tu.users_id = ?";
            long totalCount = DB.sqlQuery(totalCountSql)
                .setParameter(currentUser.getId())
                .findOne()
                .getLong("count");

            // Convert to DTO format suitable for React datatable
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            ArrayNode taxaArray = mapper.createArrayNode();

            for (SqlRow row : rows) {
                Long taxonId = row.getLong("taxon_id");
                Taxon taxon = DB.reference(Taxon.class, taxonId);
                Integer mapType = row.getInteger("map_type");
                String revisors = taxonService.getInheritedRevisors(taxon).stream()
                    .map(u -> u.getName() + " " + u.getSurname())
                    .collect(Collectors.joining(", "));

                String taxonNameLat = row.getString("name_lat");
                Integer rankId = row.getInteger("rank");

                // Fetch taxon rank (CZ name)
                String taxonRankCz = "";
                if (rankId != null) {
                    TaxonRank rank = TaxonRank.find().byId(rankId);
                    if (rank != null && rank.getNameCz() != null) {
                        taxonRankCz = rank.getNameCz();
                    }
                }

                String preslia = row.getString("preslia") != null ? row.getString("preslia") : "";
                String revisorsComment = row.getString("revisors_comment") != null ? row.getString("revisors_comment") : "";
                String revisorsPrintComment = row.getString("revisors_print_map_comment") != null ? row.getString("revisors_print_map_comment") : "";

                // common_threshold: 0 means null in DB
                Integer commonThreshold = row.getInteger("common_threshold");
                if (commonThreshold != null && commonThreshold == 0) {
                    commonThreshold = null;
                }

                Integer revisionStatusId = row.getInteger("revision_status");
                String revisionStatusDescription = "";
                if (revisionStatusId != null) {
                    RevisionStatus rs = RevisionStatus.find().byId(revisionStatusId);
                    if (rs != null && rs.getDescription() != null) {
                        revisionStatusDescription = rs.getDescription();
                    }
                }

                Integer publicationStatusId = row.getInteger("publication_status");
                String publicationStatusDescription = "";
                if (publicationStatusId != null) {
                    PublicationStatus ps = PublicationStatus.find().byId(publicationStatusId);
                    if (ps != null && ps.getDescription() != null) {
                        publicationStatusDescription = ps.getDescription();
                    }
                }

                Long lastEditTimestamp = row.getTimestamp("edit_timestamp") != null ?
                    row.getTimestamp("edit_timestamp").getTime() : 0L;

                Long parentTaxonId = row.getLong("parent_taxon_id");
                String parentTaxonNameLat = row.getString("parent_name_lat");

                boolean currentUserIsRevisor = taxonService.getInheritedRevisors(taxon).contains(currentUser);

                TaxonMapSettingsDto dto = new TaxonMapSettingsDto(
                    taxonId,
                    taxonNameLat != null ? taxonNameLat : "",
                    taxonRankCz,
                    row.getBoolean("is_mapped"),
                    commonThreshold,
                    row.getBoolean("is_protected"),
                    preslia,
                    revisors,
                    revisorsComment,
                    revisorsPrintComment,
                    revisionStatusId != null ? revisionStatusId : 0,
                    revisionStatusDescription,
                    publicationStatusId != null ? publicationStatusId : 0,
                    publicationStatusDescription,
                    lastEditTimestamp,
                    parentTaxonId,
                    parentTaxonNameLat,
                    taxon.getCsvMapDetail() != null ? taxon.getCsvMapDetail().getId() : null,
                    taxon.getCsvMapDetail() != null ? taxon.getCsvMapDetail().getDatetime() : null,
                    taxon.pdfMapExists(),
                    currentUserIsRevisor,
                    mapType
                );
                taxaArray.add(mapper.valueToTree(dto));
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("taxa", taxaArray);
            response.put("filteredCount", filteredCount);
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            return internalServerError(JsonResult.error("An error occurred while retrieving taxa for user: " + e.getMessage()));
        }
    }

    /**
     * Get map settings for a single taxon by ID.
     *
     * @param request HTTP request
     * @param taxonId The ID of the taxon to get map settings for
     * @return JSON response with taxon map settings DTO
     */
    public Result getTaxonMapSettings(Http.Request request, Long taxonId) {
        try {
            // Get current user
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null) {
                return unauthorized(JsonResult.error("Unauthorized access - user not logged in"));
            }

            // Get taxon map settings
            TaxonMapSettings settings = TaxonMapSettings.find().byId(taxonId);
            if (settings == null) {
                return notFound(JsonResult.error("Taxon map settings not found for taxonId: " + taxonId));
            }

            Taxon taxon = DB.reference(Taxon.class, taxonId);
            Integer mapType = settings.getMapType();
            String revisors = taxonService.getInheritedRevisors(taxon).stream()
                .map(u -> u.getName() + " " + u.getSurname())
                .collect(Collectors.joining(", "));

            String taxonNameLat = taxon.getNameLat() != null ? taxon.getNameLat() : "";
            String taxonRankCz = "";
            if (taxon.getRank() != null) {
                Integer rankId = taxon.getRank().getId();
                if (rankId != null) {
                    TaxonRank rank = TaxonRank.find().byId(rankId);
                    if (rank != null && rank.getNameCz() != null) {
                        taxonRankCz = rank.getNameCz();
                    }
                }
            }

            String preslia = settings.getPreslia() != null ? settings.getPreslia() : "";
            String revisorsPrintComment = settings.getRevisorsPrintMapComment() != null ? settings.getRevisorsPrintMapComment() : "";

            // common_threshold: 0 means null in DB
            Integer commonThreshold = settings.getCommonThreshold();
            if (commonThreshold != null && commonThreshold == 0) {
                commonThreshold = null;
            }

            Integer revisionStatusId = null;
            String revisionStatusDescription = "";
            if (settings.getRevisionStatus() != null) {
                revisionStatusId = settings.getRevisionStatus().getId();
                if (settings.getRevisionStatus().getDescription() != null) {
                    revisionStatusDescription = settings.getRevisionStatus().getDescription();
                }
            }

            Integer publicationStatusId = null;
            String publicationStatusDescription = "";
            if (settings.getPublicationStatus() != null) {
                publicationStatusId = settings.getPublicationStatus().getId();
                if (settings.getPublicationStatus().getDescription() != null) {
                    publicationStatusDescription = settings.getPublicationStatus().getDescription();
                }
            }

            Long lastEditTimestamp = settings.getLastEditTimestamp() != null ?
                settings.getLastEditTimestamp().getTime() : 0L;

            Long parentTaxonId = null;
            String parentTaxonNameLat = "";
            if (settings.getParent() != null) {
                parentTaxonId = settings.getParent().getId();
                TaxonMapSettings parentSettings = TaxonMapSettings.find().byId(parentTaxonId);
                if (parentSettings != null) {
                    Taxon parentTaxon = DB.reference(Taxon.class, parentTaxonId);
                    parentTaxonNameLat = parentTaxon.getNameLat() != null ? parentTaxon.getNameLat() : "";
                }
            }

            boolean currentUserIsRevisor = taxonService.getInheritedRevisors(taxon).contains(currentUser);
            TaxonMapSettingsDto dto = new TaxonMapSettingsDto(
                taxonId,
                taxonNameLat,
                taxonRankCz,
                settings.isMapped(),
                commonThreshold,
                settings.isProtected(),
                preslia,
                revisors,
                settings.getRevisorsComment(),
                revisorsPrintComment,
                revisionStatusId != null ? revisionStatusId : 0,
                revisionStatusDescription,
                publicationStatusId != null ? publicationStatusId : 0,
                publicationStatusDescription,
                lastEditTimestamp,
                parentTaxonId,
                parentTaxonNameLat,
                taxon.getCsvMapDetail() != null ? taxon.getCsvMapDetail().getId() : null,
                taxon.getCsvMapDetail() != null ? taxon.getCsvMapDetail().getDatetime() : null,
                taxon.pdfMapExists(),
                currentUserIsRevisor,
                mapType
            );

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.node.ObjectNode response = mapper.createObjectNode();
            response.set("data", mapper.valueToTree(dto));
            response.put("success", true);
            return ok(response);
        } catch (Exception e) {
            return internalServerError(JsonResult.error("An error occurred while retrieving taxon map settings: " + e.getMessage()));
        }
    }

    /**
     * Build ORDER BY clause with validation to prevent SQL injection
     */
    private String buildOrderByClause(String sortField, String sortDirection) {
        // Default sorting by taxon name
        if (sortField == null || sortField.isEmpty()) {
            return "t.name_lat ASC NULLS LAST";
        }

        // Validate sort field - only allow specific column names
        String validatedField;
        switch (sortField) {
            case "taxonNameLat":
                validatedField = "t.name_lat";
                break;
            case "isMapped":
                validatedField = "ms.is_mapped";
                break;
            case "commonThreshold":
                validatedField = "ms.common_threshold";
                break;
            case "isProtected":
                validatedField = "ms.is_protected";
                break;
            case "revisionStatusId":
                validatedField = "ms.revision_status";
                break;
            case "publicationStatusId":
                validatedField = "ms.publication_status";
                break;
            default:
                validatedField = "t.name_lat";
        }

        // Validate sort direction - only ASC or DESC
        String direction = "ASC";
        if ("DESC".equalsIgnoreCase(sortDirection)) {
            direction = "DESC";
        }

        return validatedField + " " + direction + " NULLS LAST";
    }

    private ObjectNode buildSuccessResponse(String value, TaxonMapSettings settings) {
        Map<String, String> map = new HashMap<String, String>();
        map.put("timestamp", Long.toString(settings.getLastEditTimestamp().getTime()));
        String escapedValue = StringEscapeUtils.escapeHtml4(value);
        map.put("text", escapedValue);

        return JsonResult.buildSuccess(map);
    }

    public static class UpdateMapSettingsForm {
        @Required
        public Long taxonId;
        @Required
        public Long timestamp;
        @Required
        public String key;
        public String value;

        public Long getTaxonId() {
            return taxonId;
        }

        public void setTaxonId(Long taxonId) {
            this.taxonId = taxonId;
        }

        public Long getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(Long timestamp) {
            this.timestamp = timestamp;
        }

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }
}

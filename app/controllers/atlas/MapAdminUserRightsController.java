package controllers.atlas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.atlas.AtlasUserRightsDto;
import io.ebean.DB;
import models.Project;
import models.User;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;
import utils.SessionUtils;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Controller for managing user rights in the Atlas module.
 * Provides endpoints for retrieving user contribution projects and supervised taxa.
 */
@Security.Authenticated(Authorized.class)
public class MapAdminUserRightsController extends ControllerBase {

    private static final Set<String> AllowedSortColumns = new HashSet<>(Arrays.asList("name", "surname", "email"));

    /**
     * SQL text {@code escape '\' ...} – the constant carries the whole keyword with the
     * quoted escape character (a single backslash, written doubled in Java source), so
     * the relation-filter SQLs read {@code "... like ? " + LIKE_ESCAPE + " or ..."}.
     */
    private static final String LIKE_ESCAPE = "escape '\\'";

    /**
     * Plain-SQL pre-resolution of the "assigned projects" relation filter: ids of users
     * having a project whose name or abbreviation matches the (case-insensitive,
     * wildcard) filter value. The outer Ebean query then narrows the result with the
     * portable `in` expression - see getUsers. Deleted users are excluded here so the
     * pre-resolution never resurrects them. Bound parameters keep values out of SQL.
     */
    private static final String PROJECT_USER_IDS_SQL =
        "select distinct pu.user_id as user_id from atlas.projects_users pu" +
        " join atlas.projects p on p.id = pu.project_id" +
        " join public.users u on u.id = pu.user_id and not u.deleted" +
        " where lower(p.name) like ? " + LIKE_ESCAPE +
        " or lower(coalesce(p.abbrev, '')) like ? " + LIKE_ESCAPE;

    /**
     * Ids of (non-deleted) users supervising a taxon whose Latin name matches the
     * filter value (case-insensitive substring) - "supervised taxa" column filter.
     */
    private static final String TAXON_USER_IDS_SQL =
        "select distinct tu.users_id as user_id from atlas.taxons_users tu" +
        " join public.taxons t on t.id = tu.taxons_id" +
        " join public.users u on u.id = tu.users_id and not u.deleted" +
        " where lower(t.name_lat) like ? " + LIKE_ESCAPE;

    /**
     * LIKE pattern from a raw user filter value: lower-cased with % wildcards around;
     * `%`, `_` and the escape character from the value are escaped so that they match
     * literally (the SQLs above declare the escape keyword via LIKE_ESCAPE).
     */
    private static String likePattern(String filter) {
        String escaped = filter.toLowerCase()
            .replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    /** Run one of the *_USER_IDS_SQL pre-resolution queries with bound parameters. */
    private static List<Long> sqlUserIds(String sql, String... patterns) {
        io.ebean.SqlQuery query = DB.sqlQuery(sql);
        for (int i = 0; i < patterns.length; i++) {
            query.setParameter(i + 1, patterns[i]);
        }
        return query.findList().stream()
            .map(row -> row.getLong("user_id"))
            .collect(Collectors.toList());
    }

    /**
     * Get user rights including contribution projects and supervised taxa.
     * Only accessible by map admins.
     *
     * @param request HTTP request
     * @param id      User ID
     * @return JSON response with user rights
     */
    public Result getRights(Http.Request request, Long id) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (!currentUser.isMapAdmin()) {
            return unauthorized("error");
        }

        User user = User.find().byId(id);
        if (user == null) {
            return notFound("User not found");
        }

        AtlasUserRightsDto dto = AtlasUserRightsDto.fromUser(user);
        return ok(JsonResult.buildSuccess(dto));
    }

    /**
     * Get user rights for multiple users at once.
     * Only accessible by map admins.
     *
     * @param request HTTP request
     * @return JSON response with map of user rights keyed by user ID
     */
    public Result getRightsBatch(Http.Request request) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (!currentUser.isMapAdmin()) {
            return unauthorized("error");
        }

        String userIdsParam = request.getQueryString("userIds");
        if (userIdsParam == null || userIdsParam.isEmpty()) {
            return ok(JsonResult.buildSuccess(new HashMap<>()));
        }

        // Parse user IDs from comma-separated string
        List<Long> userIds = Arrays.stream(userIdsParam.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(Long::parseLong)
            .collect(Collectors.toList());

        // Fetch rights for all requested users
        Map<Long, AtlasUserRightsDto> rightsMap = new HashMap<>();
        for (Long userId : userIds) {
            User user = User.find().byId(userId);
            if (user != null) {
                rightsMap.put(userId, AtlasUserRightsDto.fromUser(user));
            }
        }

        return ok(JsonResult.buildSuccess(rightsMap));
    }

    /**
     * Distinct labels of relation values actually assigned to (non-deleted) users:
     * project names (abbreviation when present – the same label the administration
     * table shows) and Latin names of supervised taxa. Feeds the typeahead of the
     * relation filters in MapUsers; the filters match the same names server-side.
     *
     * @param request HTTP request (map admin only)
     * @return JSON response {success, data: {projects: [...], taxa: [...]}}
     */
    public Result getRightOptions(Http.Request request) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (currentUser == null || !currentUser.isMapAdmin()) {
            return unauthorized("error");
        }

        // labels shodné s buňkami tabulky: zkratka projektu, jinak jeho název
        List<String> projectLabels = DB.sqlQuery(
            "select distinct coalesce(nullif(p.abbrev, ''), p.name) as label" +
            " from atlas.projects_users pu" +
            " join atlas.projects p on p.id = pu.project_id" +
            " join public.users u on u.id = pu.user_id and not u.deleted" +
            " order by 1")
            .findList().stream().map(row -> row.getString("label")).collect(Collectors.toList());

        List<String> taxonNames = DB.sqlQuery(
            "select distinct t.name_lat as label" +
            " from atlas.taxons_users tu" +
            " join public.taxons t on t.id = tu.taxons_id" +
            " join public.users u on u.id = tu.users_id and not u.deleted" +
            " where t.name_lat is not null" +
            " order by 1")
            .findList().stream().map(row -> row.getString("label")).collect(Collectors.toList());

        ObjectMapper mapper = new ObjectMapper();
        ObjectNode data = mapper.createObjectNode();
        data.putPOJO("projects", projectLabels);
        data.putPOJO("taxa", taxonNames);
        return ok(JsonResult.buildSuccess(data));
    }

    /**
     * Get paginated list of users (id, name, surname, email) for map admins.
     * Does not expose role flags and excludes deleted users.
     *
     * @param request HTTP request
     * @return JSON response with paginated users data
     */
    public Result getUsers(Http.Request request) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (currentUser == null || !currentUser.isMapAdmin()) {
            return unauthorized("error");
        }

        try {
            // Get query parameters for sorting and filtering
            String sortBy = request.getQueryString("sortBy");
            String sortOrder = request.getQueryString("sortOrder"); // asc or desc
            String nameFilter = request.getQueryString("NameFilter");
            String surnameFilter = request.getQueryString("SurnameFilter");
            String emailFilter = request.getQueryString("EmailFilter");
            // relation filters: substring in assigned project name/abbrev, resp. in
            // Latin names of supervised taxa (param names follow the DataTable
            // convention <columnId>Filter with an upper-case first letter)
            String projectsFilter = request.getQueryString("ContributionProjectsFilter");
            String taxaFilter = request.getQueryString("SupervisedTaxaFilter");

            // Pagination parameters
            int page = request.getQueryString("page") != null ? Integer.parseInt(request.getQueryString("page")) : 1;
            int pageSize = request.getQueryString("pageSize") != null ? Integer.parseInt(request.getQueryString("pageSize")) : 20;

            // Build query - only non-deleted users, no role flags exposed
            io.ebean.Query<User> query = User.find().query();
            query.where().eq("deleted", false);

            // Apply filtering if provided
            if (nameFilter != null && !nameFilter.isEmpty()) {
                query.where().icontains("name", nameFilter);
            }
            if (surnameFilter != null && !surnameFilter.isEmpty()) {
                query.where().icontains("surname", surnameFilter);
            }
            if (emailFilter != null && !emailFilter.isEmpty()) {
                query.where().icontains("email", emailFilter);
            }
            // Relation filters pre-resolve the relation in plain SQL to a list of user
            // ids (see the *_USER_IDS_SQL constants) and narrow the user query with a
            // portable `in`. An empty list means "no user matches" and short-circuits
            // to an empty page - Ebean cannot render `in ()`.
            if (projectsFilter != null && !projectsFilter.isEmpty()) {
                String like = likePattern(projectsFilter);
                List<Long> matchedUserIds = sqlUserIds(PROJECT_USER_IDS_SQL, like, like);
                if (matchedUserIds.isEmpty()) {
                    return ok(emptyUsersResponse(page, pageSize));
                }
                query.where().in("id", matchedUserIds);
            }
            if (taxaFilter != null && !taxaFilter.isEmpty()) {
                List<Long> matchedUserIds = sqlUserIds(TAXON_USER_IDS_SQL, likePattern(taxaFilter));
                if (matchedUserIds.isEmpty()) {
                    return ok(emptyUsersResponse(page, pageSize));
                }
                query.where().in("id", matchedUserIds);
            }

            // Apply sorting if provided (only whitelisted columns)
            if (sortBy != null && !sortBy.isEmpty() && AllowedSortColumns.contains(sortBy)) {
                String sortExpression;
                if ("desc".equalsIgnoreCase(sortOrder)) {
                    sortExpression = sortBy + " desc";
                } else {
                    sortExpression = sortBy + " asc";
                }
                query.orderBy(sortExpression);
            } else {
                // Default sorting by surname
                query.orderBy("surname asc");
            }

            // Apply pagination
            int offset = (page - 1) * pageSize;
            query.setFirstRow(offset).setMaxRows(pageSize);

            // Execute query
            List<User> users = query.findList();
            int filteredCount = query.findCount();

            // Total count of non-deleted users (without filters)
            int totalCount = User.find().query().where().eq("deleted", false).findCount();
            return ok(usersResponse(users, filteredCount, totalCount, page, pageSize));
        } catch (Exception e) {
            return internalServerError("An error occurred while retrieving users data: " + e.getMessage());
        }
    }

    /**
     * Response envelope of getUsers: paginated rows plus counts; `totalCount < 0`
     * asks for the count of all non-deleted users (the short-circuit of a relation
     * filter that matched nobody does not compute it yet).
     */
    private ObjectNode usersResponse(List<User> users, int filteredCount, int totalCount, int page, int pageSize) {
        int total = totalCount >= 0
            ? totalCount
            : User.find().query().where().eq("deleted", false).findCount();
        ObjectMapper mapper = new ObjectMapper();
        ArrayNode usersArray = mapper.createArrayNode();
        for (User user : users) {
            ObjectNode userNode = mapper.createObjectNode();
            userNode.put("id", user.getId());
            userNode.put("name", user.getName() != null ? user.getName() : "");
            userNode.put("surname", user.getSurname() != null ? user.getSurname() : "");
            userNode.put("email", user.getEmail() != null ? user.getEmail() : "");
            usersArray.add(userNode);
        }

        ObjectNode response = mapper.createObjectNode();
        response.set("data", usersArray);
        response.put("filteredCount", filteredCount);
        response.put("totalCount", total);
        response.put("page", page);
        response.put("pageSize", pageSize);
        response.put("success", true);
        return response;
    }

    /** Empty result page when a relation filter matched no user (skips the users query). */
    private ObjectNode emptyUsersResponse(int page, int pageSize) {
        return usersResponse(List.of(), 0, -1, page, pageSize);
    }

    /**
     * Assign a contribution project to a user. Only accessible by map admins.
     *
     * @param request HTTP request
     * @param userId  User ID
     * @return JSON response with result
     */
    public Result assignProject(Http.Request request, Long userId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (currentUser == null || !currentUser.isMapAdmin()) {
            return unauthorized("error");
        }

        Messages messages = getMessages(request);

        try {
            JsonNode requestData = request.body().asJson();
            if (requestData == null || requestData.get("projectId") == null) {
                return badRequest(JsonResult.buildError(messages.at("MapAdminUserRights.invalidRequest")));
            }

            int projectId = requestData.get("projectId").asInt();

            User user = User.find().byId(userId);
            Project project = Project.find().byId(projectId);
            if (user == null || project == null) {
                return badRequest(JsonResult.buildError(messages.at("MapAdminUserRights.userOrProjectNotFound")));
            }

            // Assigning an already assigned project must return an error
            if (user.getContributionProjects() != null
                && user.getContributionProjects().stream().anyMatch(p -> p.getId() == projectId)) {
                return badRequest(JsonResult.buildError(messages.at("MapAdminUserRights.projectAlreadyAssigned")));
            }

            if (user.getContributionProjects() == null) {
                user.setContributionProjects(new HashSet<>());
            }
            user.getContributionProjects().add(project);
            user.save();

            return ok(JsonResult.buildSuccess());
        } catch (Exception e) {
            return internalServerError(JsonResult.buildError(messages.at("MapAdminUserRights.projectAssignmentFailed")));
        }
    }

    /**
     * Remove a contribution project from a user. Only accessible by map admins.
     *
     * @param request   HTTP request
     * @param userId    User ID
     * @param projectId Project ID
     * @return JSON response with result
     */
    public Result removeProject(Http.Request request, Long userId, Integer projectId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        if (currentUser == null || !currentUser.isMapAdmin()) {
            return unauthorized("error");
        }

        Messages messages = getMessages(request);

        User user = User.find().byId(userId);
        Project project = Project.find().byId(projectId);
        if (user == null || project == null) {
            return badRequest(JsonResult.buildError(messages.at("MapAdminUserRights.userOrProjectNotFound")));
        }

        if (user.getContributionProjects() != null) {
            user.getContributionProjects().removeIf(p -> p.getId() == projectId);
        }
        user.save();

        return ok(JsonResult.buildSuccess());
    }
}

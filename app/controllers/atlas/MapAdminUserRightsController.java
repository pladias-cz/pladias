package controllers.atlas;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.atlas.AtlasUserRightsDto;
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

            // Get total count of non-deleted users (without filters)
            int totalCount = User.find().query().where().eq("deleted", false).findCount();

            // Convert to JSON format suitable for React datatable
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
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            return internalServerError("An error occurred while retrieving users data: " + e.getMessage());
        }
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

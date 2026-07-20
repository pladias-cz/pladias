package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.atlas.AtlasUserRightsDto;
import models.User;
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
}

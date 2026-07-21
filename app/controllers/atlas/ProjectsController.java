package controllers.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.atlas.ProjectDto;
import models.Project;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for managing projects in the Atlas module.
 * Provides endpoints for retrieving project information.
 */
@Security.Authenticated(Authorized.class)
public class ProjectsController extends ControllerBase {

    /**
     * Get all projects as DTOs.
     * Only accessible by authorized users.
     *
     * @param request HTTP request
     * @return JSON response with list of project DTOs
     */
    public Result getAll(Http.Request request) {
        List<Project> projects = Project.find().query().orderBy("name").findList();
        List<ProjectDto> dtos = projects.stream()
            .map(ProjectDto::fromProject)
            .collect(Collectors.toList());
        return ok(JsonResult.buildSuccess(dtos));
    }
}

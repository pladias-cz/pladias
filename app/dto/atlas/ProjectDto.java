package dto.atlas;

import models.Project;

/**
 * DTO for Project information.
 */
public record ProjectDto(
    Long id,
    String name,
    String abbrev
) {
    public static ProjectDto fromProject(Project project) {
        return new ProjectDto(
            project.getId(),
            project.getName() != null ? project.getName() : "",
            project.getAbbrev() != null ? project.getAbbrev() : ""
        );
    }
}
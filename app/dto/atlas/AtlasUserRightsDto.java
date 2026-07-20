package dto.atlas;

import java.util.List;
import java.util.stream.Collectors;

/**
 * DTO for user rights in the Atlas module.
 * Contains projects the user can contribute to and taxa the user supervises.
 */
public record AtlasUserRightsDto(
    Long userId,
    List<ProjectDto> contributionProjects,
    List<TaxonDto> supervisedTaxa
) {
    public static AtlasUserRightsDto fromUser(models.User user) {
        List<ProjectDto> projects = user.getContributionProjects() != null
            ? user.getContributionProjects().stream()
            .map(ProjectDto::fromProject)
            .collect(Collectors.toList())
            : List.of();

        List<TaxonDto> taxa = user.getSupervisedTaxonsSorted() != null
            ? user.getSupervisedTaxonsSorted().stream()
            .map(TaxonDto::fromTaxon)
            .collect(Collectors.toList())
            : List.of();

        return new AtlasUserRightsDto(user.getId(), projects, taxa);
    }
}

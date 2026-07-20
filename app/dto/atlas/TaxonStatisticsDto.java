package dto.atlas;

import dto.UserMinimalDto;
import models.TaxonStatistics;
import org.apache.commons.lang3.tuple.Pair;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO for TaxonStatistics information.
 */
public record TaxonStatisticsDto(
    int recordsTotal,
    int recordsAccepted,
    int recordsDeclined,
    int recordsUncertain,
    int recordsUnprocessed,
    int recordsIncludedInMap,
    int recordsCommented,
    int recordsUncommented,
    int recordsBoundToQuadrants,
    int recordsBoundToSquares,
    int recordsBoundToCoords,
    int recordsNotBoundToCoords,
    int quadrantsValidated,
    int quadrantsUncertain,
    int quadrantsDeclined,
    int quadrantsUnprocessed,
    List<ProjectRecordCountDto> recordsByProject,
    List<UserMinimalDto> supervisors
) {
    public static TaxonStatisticsDto fromTaxonStatistics(TaxonStatistics stats, List<UserMinimalDto> supervisors) {
        List<ProjectRecordCountDto> projectCounts = new ArrayList<>();
        for (Pair<models.Project, Integer> pair : stats.recordsByProject) {
            projectCounts.add(new ProjectRecordCountDto(
                ProjectDto.fromProject(pair.getLeft()),
                pair.getRight()
            ));
        }

        return new TaxonStatisticsDto(
            stats.recordsTotal,
            stats.recordsAccepted,
            stats.recordsDeclined,
            stats.recordsUncertain,
            stats.recordsUnprocessed,
            stats.recordsIncludedInMap,
            stats.recordsCommented,
            stats.recordsUncommented,
            stats.recordsBoundToQuadrants,
            stats.recordsBoundToSquares,
            stats.recordsBoundToCoords,
            stats.recordsNotBoundToCoords,
            stats.quadrantsValidated,
            stats.quadrantsUncertain,
            stats.quadrantsDeclined,
            stats.quadrantsUnprocessed,
            projectCounts,
            supervisors
        );
    }

    /**
     * DTO for project record count pair.
     */
    public record ProjectRecordCountDto(
        ProjectDto project,
        int recordCount
    ) {
    }
}

package controllers.atlas;

import app.dto.atlas.PublicationStatusDto;
import app.dto.atlas.RevisionStatusDto;
import controllers.ControllerBase;
import models.PublicationStatus;
import models.RevisionStatus;
import play.mvc.Result;
import utils.JsonResult;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for providing map status information (revision and publication statuses).
 */
public class MapStatusController extends ControllerBase {

    /**
     * Returns all revision statuses sorted by id.
     */
    public Result getRevisionStatuses() {
        List<RevisionStatus> statuses = RevisionStatus.find().query().findList();

        List<RevisionStatusDto> dtos = statuses.stream()
            .sorted(Comparator.comparingInt(RevisionStatus::getId))
            .map(s -> new RevisionStatusDto(
                s.getId(),
                s.getDescription()
            ))
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }

    /**
     * Returns all publication statuses sorted by id.
     */
    public Result getPublicationStatuses() {
        List<PublicationStatus> statuses = PublicationStatus.find().query().findList();

        List<PublicationStatusDto> dtos = statuses.stream()
            .sorted(Comparator.comparingInt(PublicationStatus::getId))
            .map(s -> new PublicationStatusDto(
                s.getId(),
                s.getDescription()
            ))
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }
}

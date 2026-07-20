package controllers.react.atlas;

import app.dto.atlas.RecordOriginalityStatusDto;
import app.dto.atlas.RecordValidationStatusDto;
import controllers.ControllerBase;
import models.RecordOriginalityStatus;
import models.RecordValidationStatus;
import play.mvc.Result;
import utils.JsonResult;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for providing record status information.
 */
public class RecordStatusController extends ControllerBase {

    /**
     * Returns all record originality statuses sorted by priority.
     */
    public Result getOriginalityStatuses() {
        List<RecordOriginalityStatus> statuses = RecordOriginalityStatus.find().query().findList();

        List<RecordOriginalityStatusDto> dtos = statuses.stream()
            .sorted(Comparator.comparingInt(RecordOriginalityStatus::getPriority))
            .map(s -> new RecordOriginalityStatusDto(
                s.getId(),
                s.getName(),
                s.getIcon(),
                s.getPriority()
            ))
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }

    /**
     * Returns all record validation statuses sorted by priority.
     */
    public Result getValidationStatuses() {
        List<RecordValidationStatus> statuses = RecordValidationStatus.find().query().findList();

        List<RecordValidationStatusDto> dtos = statuses.stream()
            .sorted(Comparator.comparingInt(RecordValidationStatus::getPriority))
            .map(s -> new RecordValidationStatusDto(
                s.getId(),
                s.getDescription(),
                s.getColor(),
                s.getPriority()
            ))
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));
    }
}

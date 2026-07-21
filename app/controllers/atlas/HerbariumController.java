package controllers.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.selectItems.HerbariumOptionDto;
import models.Herbarium;
import models.Record;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.herbarium.HerbariumSerializationService;
import utils.JsonResult;

import java.util.List;

@Security.Authenticated(Authorized.class)
public class HerbariumController extends ControllerBase {

    public Result getAllExcel(Http.Request request) {
        List<Herbarium> herbariums = Herbarium.find().query().orderBy("name").findList();
        Messages messages = getMessages(request);
        try {
            byte[] data = HerbariumSerializationService.serialize(herbariums);
            String filename = String.format("attachment; filename=%s", "herbariumList.xlsx");
            return ok(data).withHeader("Content-disposition", filename).as("application/x-download");
        } catch (Exception e) {
            return ok(messages.at("HerbariumController.herbariumDetailsFailed"));
        }
    }

    public Result getNotAssigned(Http.Request request, Long recordId) {
        Messages messages = getMessages(request);
        try {
            Record record = Record.find().byId(recordId);
            if (record == null) {
                return badRequest(messages.at("HerbariumController.recordNotFound"));
            }

            List<Herbarium> assignedHerbaria = record.getHerbariums();
            List<Integer> assignedHerbariumIds = assignedHerbaria.stream().map(Herbarium::getId).toList();

            List<Herbarium> herbaria = Herbarium.find().query().orderBy("abbrev, name_sort").findList().stream().filter(h -> !assignedHerbariumIds.contains(h.getId())).toList();

            List<HerbariumOptionDto> dtos = herbaria.stream().map(HerbariumOptionDto::fromHerbarium).toList();

            return ok(JsonResult.buildSuccess(dtos));
        } catch (Exception e) {
            return badRequest(messages.at("HerbariumController.herbariumDetailsFailed"));
        }
    }
}

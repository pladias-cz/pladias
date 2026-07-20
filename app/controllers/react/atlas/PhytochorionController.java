package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.selectItems.PhytochorionOptionDto;
import models.Phytochorion;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;

import java.util.List;

@Security.Authenticated(Authorized.class)
public class PhytochorionController extends ControllerBase {

    public Result getAll() {

        List<PhytochorionOptionDto> dtos = Phytochorion.find().query().where().orderBy("phyto_id").findList().stream().map(PhytochorionOptionDto::fromPhytochorion).toList();

        return ok(JsonResult.buildSuccess(dtos));

    }
}

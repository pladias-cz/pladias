package controllers.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.selectItems.SubstrateOptionDto;
import models.nonvascular.Substrate1;
import models.nonvascular.Substrate2;
import play.mvc.Result;
import play.mvc.Security;
import utils.JsonResult;

import java.util.ArrayList;
import java.util.List;

/**
 * Volby kategorií substrátu pro editaci záznamu (ne-cevnaté).
 * Vrací páry substrát 1 + substrát 2 jako plochý seznam voleb
 * (vzor {@link PhytochorionController}).
 */
@Security.Authenticated(Authorized.class)
public class SubstrateController extends ControllerBase {

    public Result getAll() {
        List<SubstrateOptionDto> dtos = new ArrayList<>();
        for (Substrate2 substrate2 : Substrate2.all()) {
            Substrate1 substrate1 = Substrate1.find().byId(substrate2.getSubstrate1Id());
            if (substrate1 == null) {
                continue;
            }
            dtos.add(new SubstrateOptionDto(
                substrate2.getId(),
                substrate1.getKeyCz() + " – " + substrate2.getKeyCz(),
                substrate1.getId(),
                substrate1.getKeyCz()
            ));
        }
        return ok(JsonResult.buildSuccess(dtos));
    }
}

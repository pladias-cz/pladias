package controllers.react;

import controllers.ControllerBase;
import controllers.security.AuthorizedAsTaxonAdmin;
import dto.SynonymDto;
import play.data.Form;
import play.data.FormFactory;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.synonym.SynonymService;
import utils.JsonResult;

import javax.inject.Inject;

@Security.Authenticated(AuthorizedAsTaxonAdmin.class)
public class SynonymController extends ControllerBase {
    @Inject
    private FormFactory formFactory;
    private final SynonymService service = new SynonymService();

    public Result add(Http.Request request, Long id) {
        Messages messages = getMessages(request);
        Form<SynonymDto> synonymDto = formFactory.form(SynonymDto.class).bindFromRequest(request);
        try {
            service.add(synonymDto.get());
        } catch (Exception e) {
            return badRequest(e.getMessage());
        }
        return created(JsonResult.success(messages.at("SynonymManager.created")));
    }

    public Result modify(Http.Request request, Long id) throws Exception {
        Messages messages = getMessages(request);
        try {
            Form<SynonymDto> synonym = formFactory.form(SynonymDto.class).bindFromRequest(request);
            service.modify(synonym.get());
        } catch (Exception e) {
            return badRequest(JsonResult.error(e.getMessage()));
        }
        return created(JsonResult.success(messages.at("SynonymManager.updated")));

    }

    public Result delete(Http.Request request, Long id) throws Exception {
        Messages messages = getMessages(request);
        if (id == null) {
            return badRequest(JsonResult.error(messages.at("SynonymManager.idNotDefined")));
        }
        try {
            service.delete(id);
        } catch (Exception e) {
            return badRequest(JsonResult.error(e.getMessage()));
        }
        return ok(JsonResult.success(messages.at("SynonymManager.deleted")));
    }
}

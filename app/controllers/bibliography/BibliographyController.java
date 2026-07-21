package controllers.bibliography;

import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.JournalDto;
import models.biblio.Bibliography;
import play.data.Form;
import play.data.FormFactory;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.biblio.search.BiblioSearchForm;
import service.biblio.search.ReactBiblioSearchService;
import service.biblio.search.ReactBiblioSearchService.SearchResult;
import utils.JsonResult;

import javax.inject.Inject;
import java.util.List;

@Security.Authenticated(Authorized.class)
public class BibliographyController extends ControllerBase {
    @Inject
    private FormFactory formFactory;

    public Result getJournals() {

        List<JournalDto> dtos = Bibliography.find().query()
            .select("journal")
            .where()
            .ne("journal", "")
            .orderBy("journal")
            .setDistinct(true)
            .findSingleAttributeList()
            .stream()
            .map(o -> new JournalDto((String) o))
            .toList();

        return ok(JsonResult.buildSuccess(dtos));

    }

    /**
     * React search endpoint with server-side pagination, sorting, and filtering
     */
    public Result searchReact(Http.Request request) {
        Messages messages = getMessages(request);
        Form<BiblioSearchForm> form = formFactory.form(BiblioSearchForm.class).bindFromRequest(request);
        if (form.hasErrors()) {
            return badRequest(JsonResult.buildError("Form has errors"));
        }

        // Extract pagination params
        int page = 1;
        int pageSize = 20;
        String sortBy = "";
        String sortOrder = "asc";

        // Extract column filters - queryString returns Optional<String>
        String authorsFilter = request.queryString("AuthorsFilter").orElse("");
        String titleFilter = request.queryString("TitleFilter").orElse("");
        String journalFilter = request.queryString("JournalFilter").orElse("");
        String yearFilter = request.queryString("YearFilter").orElse("");
        String excerptedFilter = request.queryString("ExcerptedFilter").orElse("");
        String etcFilter = request.queryString("EtcFilter").orElse("");

        try {
            String pageStr = request.queryString("page").orElse("");
            if (pageStr != null && !pageStr.isEmpty()) {
                page = Integer.parseInt(pageStr);
            }
        } catch (NumberFormatException e) {
            // use default
        }

        try {
            String pageSizeStr = request.queryString("pageSize").orElse("");
            if (pageSizeStr != null && !pageSizeStr.isEmpty()) {
                pageSize = Integer.parseInt(pageSizeStr);
            }
        } catch (NumberFormatException e) {
            // use default
        }

        sortBy = request.queryString("sortBy").orElse("");
        sortOrder = request.queryString("sortOrder").orElse("asc");

        ReactBiblioSearchService service = new ReactBiblioSearchService();
        SearchResult result = service.searchWithFilters(
            form.get(), page, pageSize, sortBy, sortOrder,
            authorsFilter, titleFilter, journalFilter, yearFilter, excerptedFilter, etcFilter
        );

        ObjectNode response = Json.newObject();
        response.set("data", Json.toJson(result.data));
        response.put("totalCount", result.totalCount);
        response.put("filteredCount", result.totalCount);
        response.put("success", true);

        return ok(response);
    }
}

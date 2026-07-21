package controllers.taxon;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.TaxonRankDto;
import play.mvc.*;
import play.mvc.Security;
import service.taxon.ITaxonService;
import service.taxon.TaxonRankSearchService;
import utils.JsonResult;

import javax.inject.Inject;

@Security.Authenticated(Authorized.class)
public class TaxonRankController extends ControllerBase {


    @Inject
    private ITaxonService taxonService;


    /* ===================== GET ===================== */

    // GET /api/taxonrank/:id
    public Result getRank(int id) {
        TaxonRankDto rank = TaxonRankSearchService.getDto(id);
        if (rank == null) {
            return notFound(JsonResult.error("rank not found"));
        }
        return ok(JsonResult.buildSuccess(
            rank)
        );
    }

    public Result getAll() {
        return ok(JsonResult.buildSuccess(
            TaxonRankSearchService.getAllDto()
        ));

    }

    public Result getExportable() {
        return ok(JsonResult.buildSuccess(
            TaxonRankSearchService.getExportableDto()
        ));

    }
}

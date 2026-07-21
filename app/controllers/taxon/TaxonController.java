package controllers.taxon;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.SynonymDto;
import dto.TaxonDto;
import models.*;
import models.Record;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.taxon.ITaxonService;
import service.taxon.TaxonSearchService;
import utils.JsonResult;
import utils.SessionUtils;
import utils.TaxonUtils;

import javax.inject.Inject;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Security.Authenticated(Authorized.class)
public class TaxonController extends ControllerBase {

    public static final Integer MIN_PREFIX_LENGHT = 2;
    @Inject
    private ITaxonService taxonService;

    protected boolean validPrefix(String prefix) {
        return prefix != null && prefix.length() >= MIN_PREFIX_LENGHT;
    }

    public Result getTaxon(long id) {
        TaxonDto taxon = TaxonSearchService.getTaxonDto(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }
        return ok(JsonResult.buildSuccess(taxon));
    }

    public Result getParents(long id) {
        Taxon taxon = TaxonSearchService.getTaxon(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }
        return ok(JsonResult.buildSuccess(TaxonSearchService.getParents(taxon)));
    }

    public Result getSynonyms(long id) {
        Taxon taxon = TaxonSearchService.getTaxon(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }

        List synonyms = TaxonSynonym.find().query().where().eq("taxon_id", taxon.getId()).orderBy("id")
            // .setMaxRows(20)
            .findList().stream().map(t -> {
                SynonymDto dto = new SynonymDto();
                dto.setId(t.getId());
                dto.setTaxonId(t.getTaxon().getId());
                dto.setName(t.getNameLat());
                dto.setNameHtml(t.getNameHtml());
                dto.setSuffix(t.getSuffix());
                dto.setAutocomplete(t.isAutocomplete());
                dto.setPublication(Math.toIntExact(t.getPublication().getId()));
                return dto;
            })
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(synonyms));
    }

    public Result getPublications() {

        return ok(JsonResult.buildSuccess(Publication.getAll()));
    }

    public Result getDirectChildren(long id) {
        Taxon taxon = TaxonSearchService.getTaxon(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }
        return ok(JsonResult.buildSuccess(TaxonSearchService.getFirstChildren(taxon)));
    }

    public Result getPossibleParents(long id, String prefix) {
        if (!validPrefix(prefix)) {
            return ok(JsonResult.buildSuccess(Collections.emptyList()));
        }

        Taxon taxon = TaxonSearchService.getTaxon(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }
        return ok(JsonResult.buildSuccess(TaxonSearchService.getPotentialNewParents(taxon, prefix, taxonService)));
    }

    public Result getAll(String prefix) {
        if (!validPrefix(prefix)) {
            return ok(JsonResult.buildSuccess(Collections.emptyList()));
        }
        return ok(JsonResult.buildSuccess(TaxonSearchService.getAllTaxonsDtoWithPrefix(prefix)));

    }

    public Result getImportable(String prefix) {
        if (!validPrefix(prefix)) {
            return ok(JsonResult.buildSuccess(Collections.emptyList()));
        }
        return ok(JsonResult.buildSuccess(TaxonSearchService.getImportableTaxonsDto(prefix)));

    }

    public Result getAllForRecordEdit(Http.Request request, Long recordId) {
        Messages messages = getMessages(request);

        User currentUser = SessionUtils.getCurrentUser(request.session());
        models.Record record = Record.find().byId((long) recordId);
        if (record == null) {
            return notFound(messages.at("RecordEditController.invalidRecordId"));
        }

        return currentUser.isMapAdmin()
            ? ok(JsonResult.buildSuccess(TaxonSearchService.getAllImportableTaxonsDto()))
            : ok(JsonResult.buildSuccess(TaxonSearchService.getEditableFamiliaMembersDto(record.getTaxon())));

    }

    public Result getStatistics(long id) {
        Taxon taxon = TaxonSearchService.getTaxon(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }
        return ok(JsonResult.buildSuccess(taxon.getStatistics()));
    }

    public Result getTraitCount(long id) {
        Taxon taxon = TaxonSearchService.getTaxon(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }
        return ok(JsonResult.buildSuccess(TaxonUtils.getTraitCountForTaxon(taxon.getId())));
    }

}

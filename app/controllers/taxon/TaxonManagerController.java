package controllers.taxon;


import com.fasterxml.jackson.databind.JsonNode;
import controllers.ControllerBase;
import controllers.security.AuthorizedAsTaxonAdmin;
import dto.TaxonDto;
import models.Taxon;
import models.TaxonRank;
import models.User;
import models.UserActivity;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.taxon.ITaxonService;
import service.taxon.TaxonSearchService;
import service.taxon.TaxonUpdaterService;
import service.user.ActivityDetails;
import service.user.UserActivityService;
import utils.JsonResult;
import utils.SessionUtils;
import utils.TaxonEditorLock;

import javax.inject.Inject;

@Security.Authenticated(AuthorizedAsTaxonAdmin.class)
public class TaxonManagerController extends ControllerBase {


    public static final String LatinName = "LATNAME";
    public static final String CzName = "CZNAME";
    public static final String Rank = "RANK";
    public static final String Author = "AUTHOR";
    public static final String HybridParentage = "HYBRIDPARENTAGE";
    public static final String Suppressed = "SUPPRESSED";
    public static final String Comment = "COMMENT";
    public static final String NameHtml = "NAMEHTML";
    final Logger logger = LoggerFactory.getLogger(TaxonManagerController.class);
    @Inject
    private ITaxonService taxonService;
    @Inject
    private FormFactory formFactory;

    protected boolean canEdit(Http.Request request) {
        User user = SessionUtils.getCurrentUser(request.session());

        if (user == null || !user.isTaxonAdmin()) {
            return false;
        }

        return TaxonEditorLock.Instance.Lock(user);
    }

    protected Result locked(Messages messages) {
        return forbidden(JsonResult.error(
            messages.at(
                "TaxonEditController.TaxonEditorLocked",
                TaxonEditorLock.Instance.getLockedByUserName())));
    }

    public Result patch(Http.Request request, Long id) {
        Messages messages = getMessages(request);
        if (!canEdit(request)) {
            return taxonEditorLockedErrorResponse(messages);
        }

        JsonNode json = request.body().asJson();
        String field = json.get("field").asText();
        String value = json.get("value").asText();

        try {
            ActivityDetails activityDetails = doEditField(id, field, value);
            UserActivityService.recordActivity(request.session(), UserActivity.EditRecord, activityDetails);
            TaxonEditorLock.Instance.SetDirty(true);
            TaxonDto taxon = TaxonSearchService.getTaxonDto(id);
            return ok(JsonResult.buildSuccess(taxon));
        } catch (Exception e) {
            return ok(JsonResult.error(e.getMessage()));
        }
    }

    private ActivityDetails doEditField(long taxonId, String key, String value) {
        ActivityDetails activityDetails = new ActivityDetails();
        activityDetails.newValue = value;
        Taxon taxon = Taxon.find().byId(taxonId);

        activityDetails.description = key;
        switch (key) {
            case LatinName:
                activityDetails.oldValue = taxon.getNameLat();
                taxon.setNameLat(value);
                break;
            case CzName:
                activityDetails.oldValue = taxon.getNameCz();
                taxon.setNameCz(value);
                break;
            case Rank:
                activityDetails = setRank(taxon, value, activityDetails);
                break;
            case Author:
                activityDetails.oldValue = taxon.getAuthor();
                taxon.setAuthor(value);
                break;
            case HybridParentage:
                activityDetails.oldValue = taxon.getHybridParentage();
                taxon.setHybridParentage(value);
                break;
            case Suppressed:
                activityDetails.oldValue = Boolean.toString(taxon.isSuppressed());
                taxon.setSuppressed(Boolean.parseBoolean(value));
                break;
            case Comment:
                activityDetails.oldValue = StringUtils.defaultIfBlank(taxon.getComment(), StringUtils.EMPTY);
                taxon.setComment(value);
                break;
            case NameHtml:
                activityDetails.oldValue = StringUtils.defaultIfBlank(taxon.getNameHtml(), StringUtils.EMPTY);
                taxon.setNameHtml(value);
                break;
        }
        taxon.save();
        return activityDetails;
    }

    private ActivityDetails setRank(Taxon taxon, String value, ActivityDetails activityDetails) {
        TaxonRank oldRank = taxon.getRank();
        activityDetails.oldValue = String.format("%s | %s", oldRank.getNameEng(), oldRank.getNameCz());

        TaxonRank newRank = TaxonRank.find().byId(Integer.parseInt(value));
        taxon.setRank(newRank);
        activityDetails.newValue = String.format("%s | %s", newRank.getNameEng(), newRank.getNameCz());
        return activityDetails;
    }

    private Result taxonEditorLockedErrorResponse(Messages messages) {
        String userName = TaxonEditorLock.Instance.getLockedByUserName();
        String errorMessage = messages.at("TaxonEditController.TaxonEditorLocked", userName);
        return redirect("/").flashing("error", errorMessage);
    }

    public Result moveUnderNewParent(Http.Request request, Long id) {
        Messages messages = getMessages(request);
        if (!canEdit(request)) {
            return taxonEditorLockedErrorResponse(messages);
        }

        JsonNode json = request.body().asJson();
        if (json == null || json.get("parentId") == null) {
            return badRequest("Missing parentId");
        }

        try {
            Long parentId = json.get("parentId").asLong();
            TaxonUpdaterService service = new TaxonUpdaterService();
            Taxon newTaxon = service.moveAsLastSibling(id, parentId);
            TaxonEditorLock.Instance.SetDirty(true);

            TaxonDto taxon = TaxonSearchService.getTaxonDto(id);
            return ok(JsonResult.buildSuccess(taxon));
        } catch (Exception e) {
            logger.error(e.getMessage());
            return ok(JsonResult.error(messages.at("TaxonManager.unableToCompleteOperation") + " " + e.getMessage()));
        }
    }

    public Result addFromReact(Http.Request request) {
        Messages messages = getMessages(request);

        if (!canEdit(request)) {
            return forbidden(JsonResult.error(
                messages.at("TaxonEditController.Locked")
            ));
        }

        JsonNode json = request.body().asJson();
        if (json == null) {
            return badRequest(JsonResult.error("Expected JSON body"));
        }

        AddTaxon formData = new AddTaxon();
        try {
            formData.parentId = json.findPath("parentId").asLong();
            formData.name = json.findPath("nameLat").asText(null);
            formData.rank = json.findPath("rankId").asLong();
        } catch (Exception e) {
            return badRequest(JsonResult.error("Invalid JSON structure"));
        }

        // ruční validace (nahrazuje @Required)
        if (formData.parentId <= 0
            || formData.rank <= 0
            || formData.name == null
            || formData.name.trim().isEmpty()) {

            return badRequest(JsonResult.error(
                messages.at("TaxonEditController.InvalidParameters")
            ));
        }

        try {
            TaxonUpdaterService service = new TaxonUpdaterService();
            Taxon newTaxon = service.insertNew(formData);
            TaxonDto taxon = TaxonSearchService.getTaxonDto(newTaxon.getId());
            return ok(JsonResult.buildSuccess(taxon));

        } catch (Exception e) {
            logger.error("Taxon create (React) failed", e);
            return internalServerError(JsonResult.error(
                "TaxonManager unable to complete operation"
            ));
        }
    }

    public Result deleteTaxon(Http.Request request, long id) {
        Messages messages = getMessages(request);
        if (!canEdit(request)) {
            return forbidden(JsonResult.error(
                messages.at("TaxonEditController.Locked")
            ));
        }
        Taxon taxon = Taxon.find().byId(id);
        if (taxon == null) {
            return ok(JsonResult.error("TaxonManager: Taxon not found"));
        }

        try {
            TaxonUpdaterService service = new TaxonUpdaterService();
            service.deleteLeafTaxon(taxon);
            return ok(JsonResult.buildSuccess());
        } catch (Exception e) {
            String message = e.getMessage();
            logger.error(message);
            return ok(JsonResult.error("TaxonManager - unable to complete operation:" + message));
        }
    }

    public Result moveBeforeSibling(Http.Request request) {
        Messages messages = getMessages(request);
        Form<MoveTaxonBeforeNewSibling> moveTaxonForm = formFactory.form(MoveTaxonBeforeNewSibling.class).bindFromRequest(request);
        if (moveTaxonForm.hasErrors()) {
            return ok(JsonResult.error(messages.at("TaxonEditController.InvalidParameters")));
        }

        User user = SessionUtils.getCurrentUser(request.session());
        if (!canEdit(request)) {
            return taxonEditorLockedErrorResponse(messages);
        }
        try {
            TaxonUpdaterService service = new TaxonUpdaterService();
            service.moveBeforeSibling(moveTaxonForm.get());
            TaxonEditorLock.Instance.SetDirty(true);
            return ok(JsonResult.buildSuccess());
        } catch (Exception e) {
            String message = e.getMessage();
            logger.error(message);
            return internalServerError(messages.at("TaxonManager.unableToCompleteOperation") + " " + message);
        }
    }

    /**
     * the solution is overtaken from old version, worth for refactoring TODO
     */

    public static class AddTaxon {
        @Required
        public long parentId;
        @Required
        public String name;
        @Required
        public long rank;

        public long getParentId() {
            return parentId;
        }

        public void setParentId(long parentId) {
            this.parentId = parentId;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public long getRank() {
            return rank;
        }

        public void setRank(long rank) {
            this.rank = rank;
        }
    }

    public static class MoveTaxonBeforeNewSibling {
        @Required
        public long taxonId;
        @Required
        public long siblingId;

        public long getTaxonId() {
            return taxonId;
        }

        public void setTaxonId(long taxonId) {
            this.taxonId = taxonId;
        }

        public long getSiblingId() {
            return siblingId;
        }

        public void setSiblingId(long siblingId) {
            this.siblingId = siblingId;
        }
    }
}

package controllers.measurement;

import controllers.ControllerBase;
import controllers.security.Authorized;
import dto.MeasurementFeatureDto;
import exceptions.NotEligibleException;
import models.User;
import play.data.Form;
import play.data.FormFactory;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.accessrights.AccessRights;
import service.accessrights.IAccessRightsService;
import service.measurement.MeasurementLookupService;
import service.trait.TraitActionResult;
import service.trait.TraitAdministrationService;
import service.trait.TraitUploadService;
import service.trait.export.TraitBackupService;
import utils.JsonResult;
import utils.SessionUtils;

import javax.inject.Inject;

/**
 * Measurement module API of the React UI. Endpoints returning a file are in {@link TraitExportController}.
 */
@Security.Authenticated(Authorized.class)
public class MeasurementController extends ControllerBase {

    @Inject
    private MeasurementLookupService lookupService;

    @Inject
    private TraitUploadService uploadService;

    @Inject
    private TraitAdministrationService administrationService;

    @Inject
    private TraitBackupService backupService;

    @Inject
    private IAccessRightsService accessRightsService;

    @Inject
    private FormFactory formFactory;

    public static class TraitBackupReq {
        private String description;

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }

    public Result getDatatypes() {
        return ok(JsonResult.buildSuccess(lookupService.getDatatypes()));
    }

    public Result getAggregationTypes() {
        return ok(JsonResult.buildSuccess(lookupService.getAggregationTypes()));
    }

    public Result getFeatureGroups() {
        return ok(JsonResult.buildSuccess(lookupService.getFeatureGroups()));
    }

    public Result getFeaturesOfGroup(Integer id) {
        return ok(JsonResult.buildSuccess(lookupService.getFeaturesOfGroup(id)));
    }

    public Result getFeature(Integer id) {
        MeasurementFeatureDto feature = lookupService.getFeature(id);
        if (feature == null) {
            return badRequest(JsonResult.error("No feature"));
        }

        return ok(JsonResult.buildSuccess(feature));
    }

    public Result getEnumerateValues(Integer id) {
        return ok(JsonResult.buildSuccess(lookupService.getEnumerateValues(id)));
    }

    public Result getVisibilityStatus() {
        return ok(JsonResult.buildSuccess(lookupService.getVisibilityStatuses()));
    }

    public Result getTraitsOfFeature(Http.Request request, Integer id) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        return ok(JsonResult.buildSuccess(lookupService.getTraitsOfFeature(currentUser, id)));
    }

    public Result getTraitDetailsEntryType() {
        return ok(JsonResult.buildSuccess(lookupService.getTraitDetailsEntryTypes()));
    }

    public Result getTraitExportSnapshots() {
        return ok(JsonResult.buildSuccess(backupService.getSnapshots()));
    }

    public Result backupResult(Http.Request request) {
        Messages messages = getMessages(request);

        if (!accessRightsService.IsActionAllowed(request.session(), AccessRights.TraitBackup)) {
            return badRequest(messages.at("TraitsController.UserNotElligible"));
        }

        Form<TraitBackupReq> form = formFactory.form(TraitBackupReq.class).bindFromRequest(request);
        if (form.hasErrors()) {
            return badRequest("Invalid input");
        }

        try {
            backupService.scheduleBackup(request.session(), messages, form.get().getDescription());
        } catch (Exception e) {
            return internalServerError(e.getMessage());
        }

        return ok(messages.at("TraitExportController.traitBackupInProgress"));
    }

    public Result importResult(Http.Request request) {
        Messages messages = getMessages(request);

        Form<TraitUploadService.TraitUploadForm> form = formFactory.form(TraitUploadService.TraitUploadForm.class)
            .bindFromRequest(request);
        if (form.hasErrors()) {
            return notFound(JsonResult.error(messages.at("TraitsController.FormContainsErrors")));
        }

        return toActionResult(uploadService.upload(request, messages, form.get()));
    }

    public Result delete(Http.Request request, int traitId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());

        return toActionResult(administrationService.deleteTrait(currentUser, getMessages(request), traitId));
    }

    public Result setDefault(Http.Request request, int traitId) {
        User currentUser = SessionUtils.getCurrentUser(request.session());
        TraitActionResult result = administrationService.setDefaultTrait(currentUser, getMessages(request), traitId);

        return result.isSuccessful()
            ? ok(JsonResult.buildSuccess())
            : ok(JsonResult.error(result.getMessage()));
    }

    public Result recomputeTraits(Http.Request request) {
        Messages messages = getMessages(request);
        User currentUser = SessionUtils.getCurrentUser(request.session());

        try {
            administrationService.recomputeAllTraits(currentUser, messages);
        } catch (NotEligibleException e) {
            return notFound(JsonResult.error(e.getMessage()));
        } catch (Exception e) {
            return internalServerError(e.getMessage());
        }

        return ok(Json.toJson(messages.at("TraitsController.RecomputationStarted")));
    }

    private Result toActionResult(TraitActionResult result) {
        return result.isSuccessful()
            ? ok(Json.toJson(result.getMessage()))
            : notFound(JsonResult.error(result.getMessage()));
    }
}

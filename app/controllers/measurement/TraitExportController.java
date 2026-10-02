package controllers.measurement;

import controllers.ControllerBase;
import controllers.security.Authorized;
import exceptions.NotEligibleException;
import models.User;
import models.UserActivity;
import models.traits.Feature;
import models.traits.Trait;
import models.traitsExport.TraitExportSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.i18n.Messages;
import play.mvc.Http;
import play.mvc.Http.Request;
import play.mvc.Http.Session;
import play.mvc.Result;
import play.mvc.Security;
import service.accessrights.AccessRights;
import service.accessrights.IAccessRightsService;
import service.trait.TraitDownloadService;
import service.trait.export.TraitBackupService;
import service.trait.export.TraitComplexExportService;
import service.trait.export.TraitExportRequest;
import service.trait.export.TraitExportRequestFactory;
import service.trait.export.TraitExportRequestFactory.ComplexExportForm;
import service.trait.export.TraitExportResponse;
import service.user.ActivityDetails;
import service.user.UserActivityService;
import utils.JsonResult;
import utils.SessionUtils;
import utils.UserUtils;

import javax.inject.Inject;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * All measurement endpoints that return a file - the complex export, single trait downloads and backup snapshots.
 * The remaining measurement API is in {@link MeasurementController}.
 */
public class TraitExportController extends ControllerBase {

    private final Logger logger = LoggerFactory.getLogger(TraitExportController.class);

    @Inject
    private FormFactory formFactory;

    @Inject
    private TraitExportRequestFactory requestFactory;

    @Inject
    private TraitDownloadService downloadService;

    @Inject
    private TraitBackupService backupService;

    @Inject
    private IAccessRightsService accessRightsService;

    @Security.Authenticated(Authorized.class)
    public Result complexExportResult(Http.Request request) {
        Messages messages = getMessages(request);

        Form<ComplexExportForm> form = formFactory.form(ComplexExportForm.class).bindFromRequest(request);
        if (form.hasErrors()) {
            return badRequest(JsonResult.error(messages.at("TraitExportController.invalidInput")));
        }

        ComplexExportForm exportRequest = form.get();
        Map<String, String[]> parameters = request.body().asFormUrlEncoded();
        List<Integer> traitIdList = requestFactory.buildTraitIdList(parameters == null ? null : parameters.get("traitIds[]"));

        // validate the whole request before the expensive export itself
        if (traitIdList.isEmpty()) {
            return badRequest(JsonResult.error(messages.at("TraitExportController.noTraitsSelected")));
        }

        if (exportRequest.getRanks() == null || exportRequest.getRanks().length == 0) {
            return badRequest(JsonResult.error(messages.at("TraitExportController.noRanksSelected")));
        }

        List<String> invalidTaxonNames = requestFactory.selectInvalidTaxonNames(exportRequest.getTaxonList());
        if (!invalidTaxonNames.isEmpty()) {
            // invalid names are returned separately so the UI can show them line by line for copy&fix
            return badRequest(JsonResult.error(
                messages.at("TraitExportController.invalidTaxa"),
                Collections.singletonMap("invalidTaxa", String.join("\n", invalidTaxonNames))));
        }

        try {
            TraitExportRequest exportDetails = requestFactory.create(exportRequest, traitIdList);
            User currentUser = SessionUtils.getCurrentUser(request.session());
            requestFactory.verifyUserAllowedToExport(currentUser, messages, exportDetails.traitList);
            logComplexExport(request.session());

            return toResult(buildComplexExport(messages, currentUser, exportDetails));
        } catch (NotEligibleException e) {
            return forbidden(JsonResult.error(e.getMessage()));
        } catch (Exception e) {
            logger.error("Failure during trait export", e);
            return internalServerError(JsonResult.error(messages.at("TraitExportController.exportFailed")));
        }
    }

    @Security.Authenticated(Authorized.class)
    public Result exportTrait(Request request, Integer traitId) throws Exception {
        Messages messages = getMessages(request);
        Trait trait = downloadService.findTrait(traitId);
        if (trait == null) {
            return badRequest("Trait not found");
        }
        if (!downloadService.isInheritanceTypeSupported(trait)) {
            return badRequest("Trait type not supported");
        }

        User user = SessionUtils.getCurrentUser(request.session());
        if (!UserUtils.isElligibleForTraitDownload(user, trait)) {
            return badRequest(messages.at("TraitsController.UserNotElligible"));
        }

        return toResult(downloadService.exportTrait(user, messages, trait));
    }
    @Security.Authenticated(Authorized.class)
    public Result downloadTraitData(Request request, Integer traitId, String language) {
        Messages messages = getMessages(request);
        Trait trait = downloadService.findTrait(traitId);
        User currentUser = SessionUtils.getCurrentUser(request.session());

        if (!UserUtils.isElligibleForTraitDownload(currentUser, trait)) {
            return ok(JsonResult.error(messages.at("TraitsController.UserNotElligible")));
        }

        Locale lang = Locale.forLanguageTag(language);
        return downloadOrReportError(request, trait, currentUser, messages, lang);
    }

    //this method is intentionally NOT secured with authentication - as it is accessed from pladias.cz
    public Result downloadTraitDataByFeature(Request request, int featureId, String language) {
        Messages messages = getMessages(request);
        Feature feature = downloadService.findFeature(featureId);

        if (feature == null) {
            return ok(messages.at("TraitsController.InvalidFeature"));
        }

        Locale locale = new Locale.Builder().setLanguageTag(language).build();
        Trait candidate = downloadService.findPublicTraitForFeature(featureId);

        if (candidate == null) {
            return ok(messages.at("TraitsController.NoSuitableTraitFound"));
        }

        return downloadOrReportError(request, candidate, null, messages, locale);
    }

    @Security.Authenticated(Authorized.class)
    public Result downloadAttachment(int traitId) {
        try {
            Trait trait = downloadService.findTrait(traitId);
            TraitExportResponse attachment = downloadService.downloadAttachment(trait);
            if (attachment == null) {
                return ok();
            }

            return toResult(attachment);
        } catch (Exception e) {
            logger.error("error during trait attachment export:", e);
            return ok("export se nezdaril");
        }
    }

    @Security.Authenticated(Authorized.class)
    public Result downloadSnapshot(Request request, Integer id) {
        Messages messages = getMessages(request);

        if (!accessRightsService.IsActionAllowed(request.session(), AccessRights.TraitBackup)) {
            return badRequest(messages.at("TraitsController.UserNotElligible"));
        }

        TraitExportSnapshot snapshot = backupService.getSnapshot(id);
        if (snapshot == null) {
            return notFound("trait export not found");
        }

        return toResult(snapshot.toExportResponse());
    }

    private Result downloadOrReportError(Request request, Trait trait, User user, Messages messages, Locale locale) {
        try {
            return toResult(downloadService.downloadTraitData(request.session(), trait, user, messages, locale));
        } catch (Exception e) {
            logger.error("error during trait export:", e);
            return ok("export se nezdaril");
        }
    }

    private TraitExportResponse buildComplexExport(Messages messages, User currentUser, TraitExportRequest exportDetails) throws Exception {
        return new TraitComplexExportService(messages).buildDetailedExport(currentUser, exportDetails);
    }

    private void logComplexExport(Session session) {
        ActivityDetails details = new ActivityDetails();
        details.description = String.format("Trait complex export");
        UserActivityService.recordActivity(session, UserActivity.ComplexTraitDownload, details);
    }

    private Result toResult(TraitExportResponse traitDetails) {
        String filename = String.format("attachment; filename=%s", traitDetails.getFilename());

        return ok(traitDetails.getBytes())
            .withHeader("Content-disposition", filename)
            .as("application/x-download");
    }
}

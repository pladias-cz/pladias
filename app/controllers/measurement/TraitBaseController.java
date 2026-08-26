package controllers.measurement;

import controllers.ControllerBase;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import models.User;
import play.i18n.Messages;
import play.mvc.Result;
import play.mvc.Http.Session;
import service.trait.export.TraitComplexExportService;
import service.trait.export.TraitExportRequest;
import service.trait.export.TraitExportResponse;
import utils.SessionUtils;

public class TraitBaseController extends ControllerBase
{
    private final Logger logger = LoggerFactory.getLogger(TraitBaseController.class);

    protected TraitExportResponse buildComplexExport(Session session, TraitExportRequest exportDetails) throws Exception
    {
        Messages messages = getMessages(session);
        User currentUser = SessionUtils.getCurrentUser(session);

        TraitComplexExportService exportService =
                new TraitComplexExportService(messages);
        return exportService.buildDetailedExport(currentUser, exportDetails);
    }

    protected Result toResult(TraitExportResponse traitDetails)
    {
        try
        {
            String filename = String.format("attachment; filename=%s", traitDetails.getFilename());

            return ok(traitDetails.getBytes())
                .withHeader("Content-disposition", filename)
                .as("application/x-download");
        }
        catch (Exception e)
        {
            logger.error("Failure during trait export", e);
            return ok("Error during trait export");
        }
    }
}

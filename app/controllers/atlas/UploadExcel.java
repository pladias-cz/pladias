package controllers.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import models.Batch;
import models.Excel;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import utils.SessionUtils;

@Security.Authenticated(Authorized.class)
public class UploadExcel extends ControllerBase {
    private static final String UploadFileId = "fileUpload";

    final Logger logger = LoggerFactory.getLogger(UploadExcel.class);


    public Result downloadDecorated(Http.Request request, Long id) {
        Excel excel = Excel.find().byId(id);
        if (excel == null) {
            return notFound();
        }

        Batch batch = excel.getBatch();
        if (batch != null && batch.getAuthor() == null) {
            //legacy data - Batch was not always properly populated (see RecordEditPermissions)
            batch.refresh();
        }

        User currentUser = SessionUtils.getCurrentUser(request.session());
        boolean isAuthor = batch != null && batch.getAuthor() != null
            && batch.getAuthor().getId().equals(currentUser.getId());
        boolean isCommitter = batch != null && batch.getCommitter() != null
            && batch.getCommitter().getId().equals(currentUser.getId());
        if (!isAuthor && !isCommitter && !currentUser.isMapAdmin()) {
            return forbidden(getMessages(request).at("UploadExcel.notAuthorized"));
        }

        excel.refresh();
        String filename = excel.getBatch().getImported() ? excel.getImportedFilename() : excel.getVersionDecoratedFilename();
        return ok(excel.getProcessedFileInputStream())
            .withHeader("Content-disposition", "attachment; filename=" + filename)
            .as("application/x-download");
    }


}

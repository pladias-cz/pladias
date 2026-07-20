package controllers.react.atlas;

import controllers.ControllerBase;
import controllers.security.Authorized;
import models.Excel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Result;
import play.mvc.Security;

@Security.Authenticated(Authorized.class)
public class UploadExcel extends ControllerBase {
    private static final String UploadFileId = "fileUpload";

    final Logger logger = LoggerFactory.getLogger(UploadExcel.class);


    public Result downloadDecorated(Long id) {
        /**
         * TODO chybí kontrola že daný uživatel ho smí stáhnout!
         */
        Excel excel = Excel.find().byId(id);
        if (excel != null) {
            excel.refresh();
            String filename = excel.getBatch().getImported() ? excel.getImportedFilename() : excel.getVersionDecoratedFilename();
            return ok(excel.getProcessedFileInputStream())
                .withHeader("Content-disposition", "attachment; filename=" + filename)
                .as("application/x-download");
        }
        return ok("Unable to retrieve excel #" + id);
    }


}

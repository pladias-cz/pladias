package controllers.atlas;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.base.Strings;
import controllers.ControllerBase;
import controllers.security.Authorized;
import exceptions.BadRequestException;
import mail.MailService;
import models.Project;
import models.User;
import models.dto.UploadedFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.i18n.Messages;
import play.libs.Files.TemporaryFile;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Http.RequestBody;
import play.mvc.Result;
import play.mvc.Security;
import scheduler.IScheduler;
import service.excel.IDocumentLoadServiceFactory;
import service.excel.IExcelTableValidationServiceFactory;
import service.excel.ImportOp;
import tasks.CsvImportTask;
import tasks.CvsBatchValidationTask;
import utils.SessionUtils;

import javax.inject.Inject;
import java.util.List;

@Security.Authenticated(Authorized.class)
public class ImportCSVController extends ControllerBase {
    private static final String UploadFileId = "fileUpload";

    final Logger logger = LoggerFactory.getLogger(ImportCSVController.class);

    @Inject
    private FormFactory formFactory;

    @Inject
    private IExcelTableValidationServiceFactory validationServiceFactory;

    @Inject
    private IDocumentLoadServiceFactory loadServiceFactory;

    @Inject
    private MailService mailService;

    @Inject
    private IScheduler scheduler;

    /**
     * Upload CSV file for asynchronous processing (validation or import)
     * Endpoint: POST /api/react/atlas/import/csv
     */
    public Result uploadCsv(Http.Request request) {
        Messages messages = getMessages(request);

        try {
            Form<CsvUploadInfo> form = formFactory.form(CsvUploadInfo.class).bindFromRequest(request);
            verifyForm(messages, form.get());
            RequestBody body = request.body();
            Project project = resolveProject(form.get().project, messages);
            User currentUser = SessionUtils.getCurrentUser(request.session());
            verifyUserIsEligible(currentUser, project, ImportOp.valueOf(form.get().operation.toUpperCase()), messages);

            UploadedFile uploadedFile = getUploadedFile(body, currentUser, messages);

            ImportOp importOp = ImportOp.valueOf(form.get().operation.toUpperCase());
            switch (importOp) {
                case IMPORT:
                    CsvImportTask importTask = new CsvImportTask(uploadedFile, project, currentUser, mailService, loadServiceFactory, messages);
                    scheduler.registerAsync(importTask);
                    break;
                case VALIDATION:
                    CvsBatchValidationTask validationTask = new CvsBatchValidationTask(uploadedFile,
                        project, currentUser, mailService, validationServiceFactory, loadServiceFactory, messages);
                    scheduler.registerAsync(validationTask);
                    break;
            }

            ObjectNode result = Json.newObject();
            result.put("success", true);
            result.put("message", messages.at("UploadExcel.csvUploadAccepted"));
            return ok(result);

        } catch (BadRequestException ex) {
            ObjectNode error = Json.newObject();
            error.put("success", false);
            error.put("errorMessage", ex.getMessage());
            return badRequest(error);
        } catch (Exception ex) {
            logger.error(ex.getMessage(), ex);
            Throwable innerException = ex.getCause();
            if (innerException != null) {
                logger.error("Inner exception", innerException);
            }
            ObjectNode error = Json.newObject();
            error.put("success", false);
            error.put("errorMessage", ex.toString());
            return internalServerError(error);
        }
    }

    private UploadedFile getUploadedFile(RequestBody body,
                                         User currentUser, Messages messages) throws Exception {
        if (!fileUploaded(body)) {
            throw new BadRequestException(messages.at("UploadExcel.FileNotUploaded"));
        }

        MultipartFormData<TemporaryFile> multipartBody = body.asMultipartFormData();
        FilePart<TemporaryFile> filePart = multipartBody.getFile(UploadFileId);
        return new UploadedFile(filePart);
    }

    private void verifyUserIsEligible(User user, Project project, ImportOp action, Messages messages) throws Exception {

        if (action == ImportOp.VALIDATION) {
            return;
        }

        if (!user.canContributeInto(project)) {
            throw new Exception(messages.at("UploadExcel.userNotAllowedToImportIntoSelectedProject"));
        }
    }

    private Project resolveProject(Integer projectId, Messages messages) throws Exception {

        if (projectId == null) {
            throw new Exception(messages.at("UploadExcel.NoProjectProvidedVerifyYouHaveBeenGrantedProjectAccess"));
        }

        Project project = Project.find().byId(projectId);
        if (project == null) {
            throw new Exception(messages.at("UploadExcel.NoProjectProvidedVerifyYouHaveBeenGrantedProjectAccess"));
        }
        return project;
    }

    private void verifyForm(Messages messages, CsvUploadInfo csvInfo) throws Exception {
        ImportOp importOp = ImportOp.valueOf(Strings.nullToEmpty(csvInfo.operation).toUpperCase());

        if (importOp == ImportOp.IMPORT) {
            Integer projectId = csvInfo.project;
            if (projectId == null) {
                throw new Exception(messages.at("UploadExcel.FormNotComplete"));
            }
        }
    }

    private boolean fileUploaded(RequestBody body) {
        MultipartFormData<TemporaryFile> multipart = body.asMultipartFormData();
        List<FilePart<TemporaryFile>> fileParts = multipart.getFiles();

        return (fileParts.size() == 1);
    }

    /**
     * Form data class for CSV upload
     */
    public static class CsvUploadInfo {
        public String operation;
        public Integer project;

        public String getOperation() {
            return operation;
        }

        public void setOperation(String operation) {
            this.operation = operation;
        }

        public Integer getProject() {
            return project;
        }

        public void setProject(Integer project) {
            this.project = project;
        }
    }
}

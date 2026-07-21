package controllers.atlas;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.base.Strings;
import com.google.common.collect.Iterators;
import controllers.ControllerBase;
import controllers.security.Authorized;
import excel.CellHelper;
import excel.ExcelTableErrorDecorator;
import excel.ExcelTableStyleCleaner;
import exceptions.BadRequestException;
import helpers.coords.MapUrlGenerator;
import models.*;
import models.Record;
import models.dto.UploadedFile;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.Form;
import play.data.FormFactory;
import play.db.Database;
import play.i18n.Messages;
import play.libs.Files.TemporaryFile;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Http.RequestBody;
import play.mvc.Result;
import play.mvc.Security;
import service.excel.*;
import service.excel.impl.*;
import service.excel.impl.recordRow.DocumentRowParserBase;
import service.excel.impl.recordRow.ExcelRowParserFactory;
import service.user.UserActivityService;
import utils.ExcelUtils;
import utils.SessionUtils;

import javax.inject.Inject;
import java.io.File;
import java.io.IOException;
import java.util.List;

@Security.Authenticated(Authorized.class)
public class ImportController extends ControllerBase {
    private static final String UploadFileId = "fileUpload";

    final Logger logger = LoggerFactory.getLogger(ImportController.class);

    @Inject
    private FormFactory formFactory;

    @Inject
    private Database database;

    @Inject
    private IExcelTableValidationServiceFactory validationServiceFactory;

    @Inject
    private IDocumentLoadServiceFactory loadServiceFactory;

    @Inject
    private IExcelTableImportService importService;

    /**
     * Validate Excel file - returns JSON response with validation results
     * Endpoint: POST /api/react/import/validate
     */
    public Result validateExcel(Http.Request request) {
        return processExcelUpload(request, ImportOp.VALIDATION);
    }

    /**
     * Upload/Import Excel file - returns JSON response with import results
     * Endpoint: POST /api/react/import/upload
     */
    public Result uploadExcel(Http.Request request) {
        return processExcelUpload(request, ImportOp.IMPORT);
    }

    /**
     * Common method to process Excel upload for both validation and import operations
     */
    private Result processExcelUpload(Http.Request request, ImportOp importOp) {
        Messages messages = getMessages(request);

        try {
            Form<ExcelUploadInfo> form = formFactory.form(ExcelUploadInfo.class).bindFromRequest(request);
            verifyForm(messages, form.get());
            RequestBody body = request.body();
            Project project = resolveProject(form.get().project, messages);
            User currentUser = SessionUtils.getCurrentUser(request.session());
            verifyUserIsEligible(currentUser, project, importOp, messages);

            UploadedFile uploadedFile = getUploadedFile(body, currentUser, messages);

            WorkbookWrapper wbWrapper = WorkbookWrapperFactory.createAndDelete(uploadedFile);
            Sheet dataSheet = wbWrapper.getWorkbook().getSheetAt(IDocumentLoadService.DataSheetId);

            DocumentRowParserBase rowParser = ExcelRowParserFactory.create(configService, wbWrapper.getWorkbook());
            IDocument doc = new ExcelDocument(dataSheet);
            Iterable<ParsedRecordDetails> recordDetails = parse(doc, rowParser, project, messages);

            populateMapCoordsUrls(wbWrapper, dataSheet, rowParser, recordDetails);
            decorateWithErrors(wbWrapper, rowParser, recordDetails);
            ExcelDocHelper.populateExcelSheet(dataSheet, recordDetails);


            Batch batch = createBatch(currentUser);
            Excel excel = createExcel(wbWrapper, recordDetails, batch);
            excel.save();

            boolean imported = false;
            if (importOp == ImportOp.IMPORT && getErrorCount(recordDetails) == 0) {
                importRecords(recordDetails, batch, project, database);
                batch.setImported(true);
                batch.save();
                imported = true;
                UserActivityService.recordActivity(request.session(), UserActivity.BatchImport);
            } else {
                UserActivityService.recordActivity(request.session(), UserActivity.BatchValidation);
            }

            // Build JSON response
            ObjectNode result = Json.newObject();
            result.put("success", true);
            result.put("id", excel.getId());
            result.put("filename", excel.getFilename());
            result.put("records", excel.getRecords());
            result.put("errors", excel.getErrors());
            result.put("warnings", excel.getWarnings());
            result.put("imported", imported);
            if (!imported || excel.getErrors() > 0) {
                result.put("decoratedFileUrl", "/api/react/occurrence/imports/" + excel.getId());
            }

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

    private UploadedFile getUploadedFile(RequestBody body, User currentUser, Messages messages) throws Exception {
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
            return null;
        }

        Project project = Project.find().byId(projectId);
        if (project == null) {
            throw new Exception(messages.at("UploadExcel.NoProjectProvidedVerifyYouHaveBeenGrantedProjectAccess"));
        }
        return project;
    }

    private void verifyForm(Messages messages, ExcelUploadInfo excelInfo) throws Exception {
        ImportOp importOp = ImportOp.valueOf(Strings.nullToEmpty(excelInfo.operation).toUpperCase());

        if (importOp == ImportOp.IMPORT) {
            Integer projectId = excelInfo.project;
            if (projectId == null) {
                throw new Exception(messages.at("UploadExcel.FormNotComplete"));
            }
        }
    }

    private Batch createBatch(User user) {
        Batch batch = new Batch();
        batch.setCommitter(user);
        batch.setAuthor(user);
        return batch;
    }

    private void importRecords(Iterable<ParsedRecordDetails> wrappers, Batch batch, Project project, Database database) throws Exception {
        importService.prepareImport(wrappers, batch, project);
        importService.executeImport(wrappers, batch.getAuthor());
    }

    private int getErrorCount(Iterable<ParsedRecordDetails> wrappers) {
        int errorCount = 0;

        for (ParsedRecordDetails wrapper : wrappers) {
            errorCount += wrapper.getErrors().length;
        }
        return errorCount;
    }

    private int getWarningCount(Iterable<ParsedRecordDetails> wrappers) {
        int warningCount = 0;
        for (ParsedRecordDetails wrapper : wrappers) {
            warningCount += wrapper.getWarnings().length;
        }
        return warningCount;
    }

    private int getInfoCount(Iterable<ParsedRecordDetails> wrappers) {
        int warningCount = 0;
        for (ParsedRecordDetails wrapper : wrappers) {
            warningCount += wrapper.getInfos().length;
        }
        return warningCount;
    }

    private boolean fileUploaded(RequestBody body) {
        MultipartFormData<File> multipart = body.asMultipartFormData();
        List<FilePart<File>> fileParts = multipart.getFiles();

        return (fileParts.size() == 1);
    }

    private Iterable<ParsedRecordDetails> parse(IDocument doc, DocumentRowParserBase rowParser, Project project, Messages messages)
        throws IOException {
        IDocumentLoadService loadService = loadServiceFactory.getDocumentLoadService(rowParser, messages);
        RecordRowProvider rowProvider = new RecordRowProvider(doc, rowParser);
        Iterable<ParsedRecordDetails> wrappers = loadService.loadRecords(rowProvider);

        List<IExcelTableValidationService> validationServices = validationServiceFactory
            .getExcelValidationServices(rowParser, project, messages);

        for (IExcelTableValidationService validationService : validationServices) {
            validationService.validateAll(wrappers);
        }

        return wrappers;
    }

    private void populateMapCoordsUrls(WorkbookWrapper wbWrapper, Sheet sheet, IRecordColumnMapper colMapper, Iterable<ParsedRecordDetails> wrappers) {
        int column = colMapper.getColumn(IExcelTableColumns.GPS_URL_COLUMN_ID);

        for (ParsedRecordDetails wrapper : wrappers) {
            Record r = wrapper.getRecord();
            if (r.hasCoords()) {
                String url = MapUrlGenerator.getMapyCzUrl(r.getLongitude(), r.getLatitude());
                Row row = sheet.getRow((int) wrapper.getRowNumber());
                Cell cell = CellHelper.getOrCreateCell(row, column);
                wbWrapper.populateCellWithHyperlink(cell, url, "mapy.cz");
            }
        }
    }

    private void decorateWithErrors(WorkbookWrapper workbookWrapper, IRecordColumnMapper colMapper, Iterable<ParsedRecordDetails> wrappers) throws IOException {
        Sheet sheet = workbookWrapper.getWorkbook().getSheetAt(IDocumentLoadService.DataSheetId);
        ExcelTableStyleCleaner cleaner = new ExcelTableStyleCleaner(
            sheet, workbookWrapper.createEmptyCellStyle(),
            colMapper.getColumn(IExcelTableColumns.ERROR_REPORT_COLUMN_ID),
            new int[]{
                colMapper.getColumn(IExcelTableColumns.ERROR_REPORT_COLUMN_ID),
                colMapper.getColumn(IExcelTableColumns.INFO_REPORT_COLUMN_ID),
                colMapper.getColumn(IExcelTableColumns.WARNING_REPORT_COLUMN_ID)}
        );
        cleaner.clean(colMapper);

        ExcelTableErrorDecorator decorator = new ExcelTableErrorDecorator(
            colMapper.getColumn(IExcelTableColumns.ERROR_REPORT_COLUMN_ID),
            colMapper.getColumn(IExcelTableColumns.INFO_REPORT_COLUMN_ID),
            colMapper.getColumn(IExcelTableColumns.WARNING_REPORT_COLUMN_ID));
        decorator.decorateWithErrors(workbookWrapper, sheet, wrappers);
    }

    private Excel createExcel(WorkbookWrapper wbWrapper, Iterable<ParsedRecordDetails> wrappers, Batch batch) throws IOException {
        Excel excel = new Excel();
        excel.setProcessedFile(ExcelUtils.serializeWorkbook(wbWrapper.getWorkbook()));
        excel.setFilename(wbWrapper.getFilename());
        excel.setErrors(getErrorCount(wrappers));
        excel.setInfos(getInfoCount(wrappers));
        excel.setWarnings(getWarningCount(wrappers));
        excel.setRecords(Iterators.size(wrappers.iterator()));
        excel.setBatch(batch);
        return excel;
    }

    /**
     * Form data class for Excel upload
     */
    public static class ExcelUploadInfo {
        public String operation;
        public String institution;
        public Integer project;

        public String getOperation() {
            return operation;
        }

        public void setOperation(String operation) {
            this.operation = operation;
        }

        public String getInstitution() {
            return institution;
        }

        public void setInstitution(String institution) {
            this.institution = institution;
        }

        public Integer getProject() {
            return project;
        }

        public void setProject(Integer project) {
            this.project = project;
        }
    }
}

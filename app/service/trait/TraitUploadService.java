package service.trait;

import excel.ExcelHelper;
import io.ebean.DB;
import io.ebean.Model;
import io.ebean.Transaction;
import models.User;
import models.UserActivity;
import models.dto.UploadedFile;
import models.traits.Feature;
import models.traits.Trait;
import models.traits.ValueComment;
import models.traits.VisibilityStatus;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;
import org.apache.poi.ss.usermodel.Sheet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.validation.Constraints.Required;
import play.i18n.Messages;
import play.libs.Files.TemporaryFile;
import play.mvc.Http;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Http.Session;
import platform.ProjectConstants;
import service.excel.impl.WorkbookWrapper;
import service.excel.impl.WorkbookWrapperFactory;
import service.trait.excel.TraitsImportService;
import service.user.ActivityDetails;
import service.user.UserActivityService;
import settings.user.UserOptions;
import utils.ExcelUtils;
import utils.SessionUtils;
import utils.UserUtils;

import javax.inject.Inject;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;

/**
 * Upload of trait data by an Excel workbook - either a mere validation or a full import.
 * Creates the trait, validates the workbook and stores the data when the import is allowed.
 */
public class TraitUploadService {

    /**
     * Form bound from the trait upload request.
     */
    public static class TraitUploadForm {

        @Required
        public Long owner;
        @Required
        public Integer featureId;
        public String source;
        public String descriptionCz;
        public String descriptionEn;
        public Integer visibility;
        public String operation;

        public Long getOwner() {
            return owner;
        }

        public void setOwner(Long owner) {
            this.owner = owner;
        }

        public Integer getFeatureId() {
            return featureId;
        }

        public void setFeatureId(Integer featureId) {
            this.featureId = featureId;
        }

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public String getDescriptionCz() {
            return descriptionCz;
        }

        public void setDescriptionCz(String descriptionCz) {
            this.descriptionCz = descriptionCz;
        }

        public String getDescriptionEn() {
            return descriptionEn;
        }

        public void setDescriptionEn(String descriptionEn) {
            this.descriptionEn = descriptionEn;
        }

        public Integer getVisibility() {
            return visibility;
        }

        public void setVisibility(Integer visibility) {
            this.visibility = visibility;
        }

        public String getOperation() {
            return operation;
        }

        public void setOperation(String operation) {
            this.operation = operation;
        }
    }

    private static final int SheetId = 0;
    private static final String ImportAction = "import";
    private static final String ValidationAction = "validation";

    private static final String ExcelDatatypeDefinitionId = "data";
    private static final String AttachmentId = "attachment";

    private final Logger logger = LoggerFactory.getLogger(TraitUploadService.class);

    @Inject
    private ITraitService traitService;
    public TraitActionResult upload(Http.Request request, Messages messages, TraitUploadForm traitInfo) {
        Session session = request.session();

        if (isImport(traitInfo) && traitInfo.getVisibility() == null) {
            return TraitActionResult.failure(messages.at("TraitsController.FormContainsErrors"));
        }

        Feature feature = Feature.find().byId(traitInfo.getFeatureId());
        User currentUser = SessionUtils.getCurrentUser(session);
        if (!UserUtils.isElligibleForTraitImport(currentUser, feature)) {
            return TraitActionResult.failure(messages.at("TraitsController.UserNotElligible"));
        }

        if (ValidationAction.equals(traitInfo.getOperation()) &&
            traitInfo.getVisibility() == null) {
            //workaround that will not break the following computation
            traitInfo.setVisibility(VisibilityStatus.TraitAdminAccessId);
        }

        try (Transaction transaction = DB.beginTransaction()) {
            boolean isImport = isImport(traitInfo);
            Trait trait = createTrait(request, messages, traitInfo);
            trait.save();
            if (isImport) {
                UserActivityService.recordActivity(session, UserActivity.TraitImport);
            } else {
                UserActivityService.recordActivity(session, UserActivity.TraitValidation);
            }

            MultipartFormData<TemporaryFile> multipartBody = request.body().asMultipartFormData();
            FilePart<TemporaryFile> filePart = multipartBody.getFile(ExcelDatatypeDefinitionId);
            UploadedFile uploadedFile = new UploadedFile(filePart);
            WorkbookWrapper wbWrapper = WorkbookWrapperFactory.createAndDelete(uploadedFile);
            TraitsImportService importService = getImportService(session, messages, traitInfo.getFeatureId(), trait);

            Sheet sheet = wbWrapper.getWorkbook().getSheetAt(SheetId);
            boolean validated = importService.validate(wbWrapper, sheet);

            if (!validated || !isImport) {
                trait.delete();
            }

            if (!validated) {
                models.TemporaryFile annotatedWorkbook = serializeWorkbook(wbWrapper);
                String url = controllers.common.routes.TemporaryFilesProviderController
                    .download(annotatedWorkbook.getId())
                    .absoluteURL(request, ProjectConstants.UseHttps);

                String message = isImport
                    ? messages.at("TraitsController.ImportFailed", url)
                    : messages.at("TraitsController.ValidationFailed", url);
                transaction.commit();

                return TraitActionResult.failure(message);
            }

            if (isImport) {
                List<Model> data = importService.getDatatypes();
                int totalTaxonCount = importService.getTaxonCount();
                trait.setTotalTaxonCount(totalTaxonCount);
                trait.save();

                List<ValueComment> comments = importService.getComments();
                DB.insertAll(data);
                DB.insertAll(comments);

                //induce population of complex-export tables
                logger.info("About to populate complex export table");
                traitService.recomputeTraitValues(trait);
                logTraitUploaded(session);
            }
            transaction.commit();

            String message = isImport
                ? messages.at("TraitsController.ImportSucceeded", Integer.toString(importService.getDatatypes().size()))
                : messages.at("TraitsController.ValidationSucceeded");

            return TraitActionResult.success(message);
        } catch (Exception e) {
            logger.error("Trait Validation/Import failed", e);
            return TraitActionResult.failure("Import/validation failed: " + e.getMessage());
        }
    }
    private boolean isImport(TraitUploadForm traitInfo) {
        return ImportAction.equals(traitInfo.getOperation());
    }

    private Trait createTrait(Http.Request request, Messages messages, TraitUploadForm traitInfo) throws IOException {
        Trait t = new Trait();
        t.setDescriptionCz(traitInfo.getDescriptionCz());
        t.setDescriptionEn(traitInfo.getDescriptionEn());
        Feature f = Feature.find().byId(traitInfo.getFeatureId());
        t.setFeature(f);
        t.setVisibilityStatus(VisibilityStatus.find().byId(traitInfo.getVisibility()));
        if (f.getSubordinateTraits().isEmpty()) {
            t.setDefault(true);
        }
        t.setOwner(User.find().byId(traitInfo.getOwner()));
        t.setSource(traitInfo.getSource());
        collectAttachment(request, messages, t);
        return t;
    }

    private void collectAttachment(Http.Request request, Messages messages, Trait trait) throws IOException {
        MultipartFormData<TemporaryFile> body = request.body().asMultipartFormData();
        FilePart<TemporaryFile> filePart = body.getFile(AttachmentId);

        if (filePart != null) {
            UploadedFile uploadedFile = new UploadedFile(filePart);
            ExcelHelper.verifyExcelFilename(uploadedFile.getName(), messages);
            FileInputStream fis = new FileInputStream(uploadedFile.getFile());
            trait.setAttachment(IOUtils.toByteArray(fis));
            fis.close();
            trait.setAttachmentType(getAttachmentTypeFromFilename(uploadedFile.getName()));
            uploadedFile.delete();
        }
    }

    private String getAttachmentTypeFromFilename(String filename) {
        String extension = FilenameUtils.getExtension(filename);
        if (extension != null) {
            extension = extension.toLowerCase();
        }

        return extension;
    }

    private TraitsImportService getImportService(Session session, Messages messages, int featureId, Trait trait) throws Exception {
        Feature feature = Feature.find().byId(featureId);
        UserOptions userOptions = new UserOptions(SessionUtils.getCurrentUser(session));
        return new TraitsImportService(
            feature,
            trait != null ? trait.getId() : -1,
            userOptions,
            messages);
    }

    private models.TemporaryFile serializeWorkbook(WorkbookWrapper wbWrapper) throws IOException {
        models.TemporaryFile tempFile = new models.TemporaryFile();
        tempFile.setData(ExcelUtils.serializeWorkbook(wbWrapper.getWorkbook()));
        tempFile.setFilename(wbWrapper.getFilename());
        String extension = FilenameUtils.getExtension(wbWrapper.getFilename()).toLowerCase();
        tempFile.setExtension(extension);
        tempFile.save();
        return tempFile;
    }

    private void logTraitUploaded(Session session) {
        ActivityDetails details = new ActivityDetails();
        details.description = String.format("Trait uploaded");
        UserActivityService.recordActivity(session, UserActivity.ComplexTraitDownload, details);
        logger.info("Complex export table populated");
    }
}

package tasks;

import io.ebean.DB;
import io.ebean.Transaction;
import mail.MailService;
import models.Batch;
import models.Excel;
import models.Project;
import models.User;
import models.dto.UploadedFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.i18n.Messages;
import service.csv.CsvDocument;
import service.csv.CsvValidationService;
import service.excel.IDocumentLoadServiceFactory;
import service.excel.IExcelTableValidationServiceFactory;

import javax.mail.MessagingException;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.Arrays;

public class CvsBatchValidationTask extends CsvBaseTask {

    private final User _user;
    private final Project _project;

    private final IExcelTableValidationServiceFactory _validationServiceFactory;
    private final IDocumentLoadServiceFactory _loadServiceFactory;
    private final Messages _messages;

    private final Logger _logger = LoggerFactory.getLogger(CvsBatchValidationTask.class);

    public CvsBatchValidationTask(UploadedFile sourceFile, Project project, User currentUser,
                                  MailService mailService,
                                  IExcelTableValidationServiceFactory validationServiceFactory,
                                  IDocumentLoadServiceFactory loadServiceFactory,
                                  Messages messages) {
        super(sourceFile, mailService);
        _user = currentUser;
        _project = project;
        _validationServiceFactory = validationServiceFactory;
        _loadServiceFactory = loadServiceFactory;
        _messages = messages;
    }

    @Override
    public String getName() {
        return "CvsBatchValidation";
    }

    @Override
    public void execute() {
        File validatedFile = null;

        try (Transaction transaction = DB.beginTransaction()) {
            Batch batch = populateBatch(_user, false);
            batch.save();
            validate(batch);
            EmailMessage message = prepareSuccessMessage(batch);
            sendMessage(message);
            transaction.commit();
        } catch (Exception ex) {
            _logger.error("task failed", ex);
            EmailMessage message = prepareFailureMessage(ex.getMessage());
            try {
                sendMessage(message);
            } catch (MessagingException e) {
                _logger.error("Unable to send failure message", e);
            }
        } finally {
            if (_sourceFile != null) {
                _sourceFile.delete();
            }
            if (validatedFile != null) {
                validatedFile.delete();
            }
        }
    }

    private void validate(Batch batch)
        throws IOException, UnsupportedEncodingException, FileNotFoundException {

        File validatedFile = withCsvDocument(new IDocProcessor<File>() {

            @Override
            public File execute(CsvDocument doc) throws IOException {

                CsvValidationService csvValidationService =
                    new CsvValidationService(
                        _project, _loadServiceFactory, _validationServiceFactory, _messages);

                return csvValidationService.runValidation(doc);
            }

        });

        byte[] zippedImportFile = zipToBytes(validatedFile, _sourceFile.getName());
        Excel excel = populateExcelTable(zippedImportFile, _sourceFile.getName() + ".zip", batch, 0);
        excel.save();
        validatedFile.delete();
    }

    private EmailMessage prepareFailureMessage(String message) {
        return new EmailMessage(
            _messages.at("UploadExcel.validatesCsvFileEmailSubject", _sourceFile.getName()),
            _messages.at("UploadExcel.validatedCsvFileEmailContentsFailure") + " " + message,
            Arrays.asList(_user.getEmail()));
    }

    private EmailMessage prepareSuccessMessage(Batch batch) {
        String targetFileName = _sourceFile.getName() + ".zip";
        return new EmailMessage(
            _messages.at("UploadExcel.validatesCsvFileEmailSubject", targetFileName),
            _messages.at("UploadExcel.validatedCsvFileEmailContentsSuccess", targetFileName, Long.toString(batch.getId())),
            Arrays.asList(_user.getEmail()),
            null);
    }

}

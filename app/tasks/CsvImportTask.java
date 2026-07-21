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
import service.csv.CsvImportService;
import service.excel.IDocumentLoadServiceFactory;

import javax.mail.MessagingException;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Arrays;

public class CsvImportTask extends CsvBaseTask {

    private final static Logger _logger = LoggerFactory.getLogger(CsvImportTask.class);

    private final User _user;
    private final Project _project;

    private final IDocumentLoadServiceFactory _loadServiceFactory;

    private final Messages _messages;

    public CsvImportTask(UploadedFile sourceFile, Project project, User currentUser,
                         MailService mailService,
                         IDocumentLoadServiceFactory loadServiceFactory,
                         Messages messages) {
        super(sourceFile, mailService);
        _user = currentUser;
        _project = project;
        _loadServiceFactory = loadServiceFactory;
        _messages = messages;
    }

    @Override
    public String getName() {
        return "CsvImportTask";
    }

    @Override
    public void execute() {

        try (Transaction transaction = DB.beginTransaction()) {
            Batch batch = populateBatch(_user, true);
            batch.save();
            doImport(batch);
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
        }
    }

    private EmailMessage prepareSuccessMessage(Batch batch) {
        return new EmailMessage(
            _messages.at("UploadExcel.importCsvFileEmailSubject", _sourceFile.getName()),
            _messages.at("UploadExcel.importCsvFileEmailContentsSuccess", _sourceFile.getName(), batch.getId()),
            Arrays.asList(_user.getEmail()));
    }

    private EmailMessage prepareFailureMessage(String message) {
        return new EmailMessage(
            _messages.at("UploadExcel.importCsvFileEmailSubject", _sourceFile.getName()),
            _messages.at("UploadExcel.importCsvFileEmailContentsFailure", _sourceFile.getName(), message),
            Arrays.asList(_user.getEmail()));
    }

    private void doImport(Batch batch) throws FileNotFoundException, IOException {
        CsvImportService csvImportService = new CsvImportService(
            _project, _loadServiceFactory, batch, _messages);

        withCsvDocument((IDocProcessor<Object>) doc -> {
            csvImportService.runImport(doc);
            return null;
        });

        // import succeeded, record the zipped csv file in the database
        byte[] zippedImportFile = zipToBytes(_sourceFile.getFile(), _sourceFile.getName());
        Excel excel = populateExcelTable(zippedImportFile, _sourceFile.getName() + ".zip", batch, csvImportService.getProcessedRows());
        excel.save();
    }
}

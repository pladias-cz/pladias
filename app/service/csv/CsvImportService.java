package service.csv;

import io.ebean.DB;
import models.Batch;
import models.Project;
import models.Record;
import models.RecordAuthor;
import play.i18n.Messages;
import service.excel.IDocument;
import service.excel.IDocumentLoadService;
import service.excel.IDocumentLoadServiceFactory;
import service.excel.ParsedRecordDetails;
import service.excel.impl.RecordRowProvider;
import service.excel.impl.RowIterator;
import service.excel.impl.recordRow.DocumentRowParserBase;
import service.excel.impl.recordRow.VascularDocumentRowParserVer3;

import java.io.IOException;

public class CsvImportService {

    private final Project project;
    private final IDocumentLoadServiceFactory loadServiceFactory;
    private final Batch batch;
    private final Messages messages;
    private int processedRows = 0;

    public CsvImportService(Project project,
                            IDocumentLoadServiceFactory loadServiceFactory,
                            Batch batch,
                            Messages messages) {
        this.project = project;
        this.loadServiceFactory = loadServiceFactory;
        this.batch = batch;
        this.messages = messages;
    }

    public void runImport(IDocument doc) throws IOException {

        DocumentRowParserBase rowParser = new VascularDocumentRowParserVer3();
        IDocumentLoadService loadService = loadServiceFactory.getDocumentLoadService(rowParser, messages);

        RecordRowProvider rowProvider = new RecordRowProvider(doc, rowParser);
        RowIterator iter = loadService.getIterator(rowProvider);

        while (iter.hasMoreElements()) {
            ParsedRecordDetails details = iter.nextElement();
            saveRecordEntry(details);
        }
    }

    private void saveRecordEntry(ParsedRecordDetails details) throws IOException {
        Record record = details.getRecord();
        record.setBatch(batch);
        record.setProject(project);
        record.save();
        saveRecordAuthors(record);
        processedRows++;
    }

    private void saveRecordAuthors(Record record) {
        for (RecordAuthor ra : record.getRecordAuthors()) {
            if (ra.getAuthor().getId() == 0) {
                DB.save(ra.getAuthor());
            }
            ra.setAuthor(ra.getAuthor());
            ra.setRecord(record);
            DB.save(ra);
        }
    }

    public int getProcessedRows() {
        return processedRows;
    }
}

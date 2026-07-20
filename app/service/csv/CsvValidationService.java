package service.csv;

import excel.ExcelErrorInfo;
import models.Project;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import play.i18n.Messages;
import service.excel.*;
import service.excel.impl.RecordRowProvider;
import service.excel.impl.RowIterator;
import service.excel.impl.recordRow.DocumentRowParserBase;
import service.excel.impl.recordRow.RecordRow;
import service.excel.impl.recordRow.VascularDocumentRowParserVer3;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class CsvValidationService {

    private final Project project;
    private final IDocumentLoadServiceFactory loadServiceFactory;
    private final Messages messages;
    private final IExcelTableValidationServiceFactory validationServiceFactory;

    public CsvValidationService(Project project,
                                IDocumentLoadServiceFactory loadServiceFactory,
                                IExcelTableValidationServiceFactory validationServiceFactory,
                                Messages messages) {
        this.project = project;
        this.loadServiceFactory = loadServiceFactory;
        this.validationServiceFactory = validationServiceFactory;
        this.messages = messages;
    }

    public File runValidation(IDocument doc) throws IOException {
        DocumentRowParserBase rowParser = new VascularDocumentRowParserVer3();
        IDocumentLoadService loadService = loadServiceFactory.getDocumentLoadService(rowParser, messages);

        List<IExcelTableValidationService> validationServices = validationServiceFactory
            .getExcelValidationServices(rowParser, project, messages);

        File resultFile = File.createTempFile("abcd-", "csv");
        try (FileOutputStream fos = new FileOutputStream(resultFile)) {
            try (OutputStreamWriter osw = new OutputStreamWriter(fos, StandardCharsets.UTF_8)) {

                CSVFormat format = CSVFormat.Builder.create()
                    .setDelimiter(';')
                    .setHeader(doc.getHeaders().toArray(new String[0]))
                    .build();
                try (CSVPrinter printer = new CSVPrinter(osw, format)) {

                    RecordRowProvider rowProvider = new RecordRowProvider(doc, rowParser);
                    RowIterator iter = loadService.getIterator(rowProvider);

                    while (iter.hasMoreElements()) {
                        ParsedRecordDetails parsedDetails = iter.nextElement();
                        for (IExcelTableValidationService validationService : validationServices) {
                            validationService.validate(parsedDetails);
                        }
                        RecordRow row = decorateWithErrors(rowParser, parsedDetails);
                        Iterable<String> serialized = serializeEntry(rowParser, row);
                        printer.printRecord(serialized);
                    }
                }
            }
        }
        return resultFile;
    }

    private Iterable<String> serializeEntry(IRecordColumnMapper colMapper, RecordRow row) {
        List<String> result = new ArrayList<String>();
        int lastColumn = colMapper.getColumn(IExcelTableColumns.INFO_REPORT_COLUMN_ID);
        for (int i = 0; i <= lastColumn; i++) {
            String value = row.get(i);
            result.add(value);
        }
        return result;
    }

    private RecordRow decorateWithErrors(IRecordColumnMapper colMapper, ParsedRecordDetails parsedDetails) {
        RecordRow row = parsedDetails.getRecordRow();

        String errors = concatenateErrors(parsedDetails.getErrors());
        int errorCol = colMapper.getColumn(IExcelTableColumns.ERROR_REPORT_COLUMN_ID);
        row.put(errorCol, errors);

        String warnings = concatenateErrors(parsedDetails.getWarnings());
        int warnCol = colMapper.getColumn(IExcelTableColumns.WARNING_REPORT_COLUMN_ID);
        row.put(warnCol, warnings);

        String infos = concatenateErrors(parsedDetails.getWarnings());
        int infoCol = colMapper.getColumn(IExcelTableColumns.INFO_REPORT_COLUMN_ID);
        row.put(infoCol, infos);
        return row;
    }

    private String concatenateErrors(ExcelErrorInfo[] errors) {
        StringBuilder builder = new StringBuilder();
        for (ExcelErrorInfo error : errors) {
            builder.append(error.getDescription());
        }
        return builder.toString();
    }
}

package service.record.serialization;

import excel.ExcelLinePopulator;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.search.PageSearchResults;
import utils.ConfigHelper;

import java.io.IOException;
import java.io.OutputStream;
import java.util.List;

public class PageSearchResultSerialization {
    final static Logger logger = LoggerFactory.getLogger(PageSearchResultSerialization.class);
    final static int MaxAutosizeCollectionSize = 300;
    final static int RowAccessWindowSize = 500;

    public static void serializeToStream(List<PageSearchResults.Row> rows, OutputStream outputStream) throws IOException {
        try (SXSSFWorkbook wb = new SXSSFWorkbook(RowAccessWindowSize)) {
            wb.setCompressTempFiles(true);
            SXSSFSheet sheet = wb.createSheet();

            ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(ConfigHelper.isNonVascular());
            List<String> headers = generator.getRecordHeaders();
            boolean autoSize = shouldAutosize(rows);

            if (autoSize) {
                sheet.trackAllColumnsForAutoSizing();
            }

            int index = 0;
            ExcelLinePopulator.populate(sheet.createRow(index++), headers);

            for (PageSearchResults.Row r : rows) {
                try {
                    List<String> fields = generator.prepareRecordFields(r);
                    ExcelLinePopulator.populate(sheet.createRow(index++), fields);
                    if (index % 1000 == 0)
                        logger.info("Serialized " + index + " records");
                } catch (Exception e) {
                    e.printStackTrace();
                }

            }

            if (autoSize) {
                autosize(sheet, generator);
            }

            logger.info("Serializing workbook");
            wb.write(outputStream);
            outputStream.flush();
        } catch (Exception e) {
            logger.error("Error during record export", e);
            throw new IOException(e);
        }
    }

    private static boolean shouldAutosize(List<PageSearchResults.Row> rows) {
        return rows.size() < MaxAutosizeCollectionSize;
    }

    private static void autosize(Sheet sheet, ISearchTableDataGenerator generator) {
        for (int i = 0; i < generator.getFieldsCount(); i++) {
            logger.info("Autosize for column " + i);
            sheet.autoSizeColumn(i);
        }
    }
}

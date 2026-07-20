package service.record.serialization;


import excel.ExcelLinePopulator;
import models.Record;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import utils.ConfigHelper;
import utils.ExcelUtils;

import java.io.IOException;
import java.util.List;

public class SearchResultSerialization {

    final static Logger logger = LoggerFactory.getLogger(SearchResultSerialization.class);
    final static int MaxAutosizeCollectionSize = 300;

    public static byte[] serialize(List<Record> records) throws IOException {
        try {
            Workbook wb = new XSSFWorkbook();
            Sheet sheet = wb.createSheet();

            IRecordTableDataGenerator generator = RecordTableDataFactory.createRecordTableDataGenerator(ConfigHelper.isNonVascular());
            List<String> headers = generator.getRecordHeaders();

            int index = 0;
            ExcelLinePopulator.populate(sheet.createRow(index++), headers);

            for (Record r : records) {
                try {
                    List<String> fields = generator.prepareRecordFields(r);
                    ExcelLinePopulator.populate(sheet.createRow(index++), fields);
                    if (index % 1000 == 0)
                        logger.info("Serialized " + index + " records");
                } catch (Exception e) {
                    e.printStackTrace();
                }

            }

            if (shouldAutosize(records)) {
                autosize(sheet, generator);
            }

            logger.info("Serializing workbook");
            byte[] bytes = ExcelUtils.serializeWorkbook(wb);
            return bytes;
        } catch (Exception e) {
            logger.error("Error during record export", e);
            throw new IOException(e);
        }
    }

    private static boolean shouldAutosize(List<Record> records) {
        return records.size() < MaxAutosizeCollectionSize;
    }

    private static void autosize(Sheet sheet, IRecordTableDataGenerator generator) {
        for (int i = 0; i < generator.getFieldsCount(); i++) {
            logger.info("Autosize for column " + i);
            sheet.autoSizeColumn(i);
        }
    }
}

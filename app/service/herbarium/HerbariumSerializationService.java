package service.herbarium;

import excel.ExcelLinePopulator;
import models.Herbarium;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import play.Logger;
import utils.ExcelUtils;

import java.io.IOException;
import java.util.List;

public class HerbariumSerializationService {

    public static byte[] serialize(List<Herbarium> herbariums) throws IOException {
        try {
            Workbook wb = new XSSFWorkbook();
            Sheet sheet = wb.createSheet();

            HerbariumTableDataGenerator generator = new HerbariumTableDataGenerator();
            List<String> headers = generator.getHerbariumHeaders();

            int index = 0;
            ExcelLinePopulator.populate(sheet.createRow(index++), headers);

            for (Herbarium h : herbariums) {
                List<String> fields = generator.prepareHerbariumFields(h);
                ExcelLinePopulator.populate(sheet.createRow(index++), fields);
            }
            for (int i = 0; i < generator.getFieldsCount(); i++) {
                sheet.autoSizeColumn(i);
            }
            return ExcelUtils.serializeWorkbook(wb);
        } catch (Exception e) {
            Logger.error("Error during herbarium export", e);
            throw new IOException(e);
        }
    }
}

package excel;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;

import java.util.List;


public class ExcelLinePopulator {

    public static void populate(Row row, List<String> data) {
        int i = 0;
        for (String d : data) {
            Cell cell = row.getCell(i);
            if (cell == null) {
                cell = row.createCell(i);
            }
            i++;
            cell.setCellValue(d);
        }
    }
}

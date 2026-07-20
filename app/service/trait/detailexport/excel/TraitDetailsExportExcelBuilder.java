package service.trait.detailexport.excel;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.CellType;
import service.trait.detailexport.IDetailedExportBuilder;
import service.trait.detailexport.IExportDataTransformer;
import utils.ExcelUtils;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TraitDetailsExportExcelBuilder implements IDetailedExportBuilder {

    private Map<CellType, CellStyle> styles;

    public TraitDetailsExportExcelBuilder() {
    }

    @Override
    public byte[] build(IExportDataTransformer exportDataProvider) throws IOException {
        XSSFWorkbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet();
        initStyles(wb);
        List<List<CellDetail>> data = exportDataProvider.collectData();
        populate(sheet, data);
        return ExcelUtils.serializeWorkbook(wb);
    }

    @Override
    public String getExtension() {
        return "xlsx";
    }

    private void populate(Sheet sheet, List<List<CellDetail>> data) {
        int rowNumber = 0;

        serializeData(sheet, rowNumber, data);
    }

    private void serializeData(Sheet sheet, int rowNumber, List<List<CellDetail>> data) {

        for (List<CellDetail> rowData : data) {
            Row row = sheet.createRow(rowNumber++);
            int column = 0;
            for (CellDetail cellDetail : rowData) {
                Cell cell = row.createCell(column++);
                cell.setCellValue(cellDetail.getText());
                cell.setCellStyle(styles.get(cellDetail.getCellType()));
            }
        }
    }

    private void initStyles(XSSFWorkbook wb) {
        styles = new HashMap<CellType, CellStyle>();

        Font cellFont = wb.createFont();
        cellFont.setFontHeightInPoints((short) 10);

        XSSFCellStyle style = createCellStyle(wb, cellFont, createColor(0xee, 0xee, 0xee));
        styles.put(CellType.Data, style);

        Font titleFont = wb.createFont();
        titleFont.setFontHeightInPoints((short) 12);

        style = createCellStyle(wb, titleFont, createColor(0xbe, 0xbe, 0xbe));
        styles.put(CellType.HeaderTaxonInfo, style);

        style = createCellStyle(wb, titleFont, createColor(0x33, 0x99, 0xff));
        styles.put(CellType.HeaderOriginalValue, style);

        style = createCellStyle(wb, titleFont, createColor(0x66, 0x66, 0xff));
        styles.put(CellType.HeaderAggreatedValue, style);

        style = createCellStyle(wb, titleFont, createColor(0xcc, 0x99, 0x00));
        styles.put(CellType.HeaderInheritedValue, style);
    }

    private XSSFCellStyle createCellStyle(XSSFWorkbook wb, Font font, XSSFColor color) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setFont(font);
        style.setWrapText(false);
        style.setFillForegroundColor(color);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private XSSFColor createColor(int r, int g, int b) {
        return new XSSFColor(new java.awt.Color(r, g, b));
    }
}

package excel;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import service.excel.impl.ExcelDocHelper;
import service.excel.impl.WorkbookWrapper;

public class ExcelTableErrorDecorator {

    private final int errorColumnId;
    private final int warningColumnId;
    private final int infoColumnId;

    public ExcelTableErrorDecorator(int errorColumnId, int infoColumnId, int warningColumnId) {
        this.errorColumnId = errorColumnId;
        this.warningColumnId = warningColumnId;
        this.infoColumnId = infoColumnId;
    }

    public void autoSizeColumns(Sheet sheet, int lastColumn) {
        try {
            for (int i = 0; i <= lastColumn; i++) {
                sheet.autoSizeColumn(i);
            }
        } catch (Exception e) {
            //ignore - the specified column likely does not exist
        }
    }

    public void decorateWithErrors(WorkbookWrapper workbookWrapper, Sheet sheet, Iterable<? extends IVerifiableRecord> items) {
        CellStyle errorCellStyle = workbookWrapper.createErrorBackgroundCellStyle();
        CellStyle infoCellStyle = workbookWrapper.createInfoBackgroundCellStyle();
        CellStyle warningCellStyle = workbookWrapper.createWarningBackgroundCellStyle();

        CellStyle errorDescriptionCellStyle = workbookWrapper.createErrorDescriptionCellStyle();
        CellStyle infoDescriptionCellStyle = workbookWrapper.createInfoDescriptionCellStyle();
        CellStyle warningDescriptionCellStyle = workbookWrapper.createWarningDescriptionCellStyle();

        for (IVerifiableRecord item : items) {
            for (ExcelErrorInfo errInfo : item.getErrors()) {
                updateCellBackgroundColor(errInfo, sheet, errorCellStyle);
                createErrorComment(errInfo, sheet, errorDescriptionCellStyle, errorColumnId);
            }
            for (ExcelErrorInfo info : item.getInfos()) {
                updateCellBackgroundColor(info, sheet, infoCellStyle);
                createErrorComment(info, sheet, infoDescriptionCellStyle, infoColumnId);
            }
            for (ExcelErrorInfo warning : item.getWarnings()) {
                updateCellBackgroundColor(warning, sheet, warningCellStyle);
                createErrorComment(warning, sheet, warningDescriptionCellStyle, warningColumnId);
            }
        }
    }

    private void createErrorComment(ExcelErrorInfo errorInfo, Sheet sheet, CellStyle style, int columnId) {
        Row row = sheet.getRow((int) errorInfo.getRow());
        String currentValue = ExcelDocHelper.getSafeCellStringValue(row, columnId);
        Cell cell = CellHelper.getOrCreateCell(row, columnId);

        StringBuilder builder = new StringBuilder();
        if (currentValue != null) {
            builder.append(currentValue);
        }
        builder.append(errorInfo.getDescription());
        cell.setCellValue(builder.toString());
        cell.setCellStyle(style);
    }

    private void updateCellBackgroundColor(ExcelErrorInfo errorInfo, Sheet sheet, CellStyle style) {
        Row row = sheet.getRow((int) errorInfo.getRow());
        Cell cell = CellHelper.getOrCreateCell(row, errorInfo.getColumn());
        cell.setCellStyle(style);
    }
}

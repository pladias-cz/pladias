package service.excel.impl;

import org.apache.poi.common.usermodel.Hyperlink;
import org.apache.poi.hssf.usermodel.HSSFCellStyle;
import org.apache.poi.hssf.usermodel.HSSFFont;
import org.apache.poi.hssf.usermodel.HSSFHyperlink;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.hssf.util.HSSFColor;
import org.apache.poi.hssf.util.HSSFColor.HSSFColorPredefined;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Workbook;

import java.util.HashMap;

public class HSSFWorkbookWrapper extends WorkbookWrapper {
    private final HSSFColorPredefined ErrorCellColor = HSSFColor.HSSFColorPredefined.ORANGE;
    private final HSSFColorPredefined InfoCellColor = HSSFColor.HSSFColorPredefined.BLUE;
    private final HSSFColorPredefined WarningCellColor = HSSFColor.HSSFColorPredefined.LIME;
    private final HSSFColorPredefined AutomaticCellColor = HSSFColor.HSSFColorPredefined.AUTOMATIC;
    private final HSSFWorkbook _workbook;
    private final HashMap<Short, CellStyle> backgroundCellStyles = new HashMap<>();
    private final HashMap<Short, CellStyle> coloredTextCellStyles = new HashMap<>();

    public HSSFWorkbookWrapper(HSSFWorkbook workbook, String filename) {
        super(filename);

        if (workbook == null) {
            throw new IllegalArgumentException("workbook");
        }
        this._workbook = workbook;
    }

    @Override
    public Workbook getWorkbook() {
        return _workbook;
    }

    @Override
    public CellStyle createErrorBackgroundCellStyle() {
        return createBackgroundCellStyle(ErrorCellColor);
    }

    @Override
    public CellStyle createInfoBackgroundCellStyle() {
        return createBackgroundCellStyle(InfoCellColor);
    }

    @Override
    public CellStyle createWarningBackgroundCellStyle() {
        return createBackgroundCellStyle(WarningCellColor);
    }

    @Override
    public CellStyle createErrorDescriptionCellStyle() {
        return createColoredTextCellStyle(InfoCellColor);
    }

    @Override
    public CellStyle createWarningDescriptionCellStyle() {
        return createColoredTextCellStyle(WarningCellColor);
    }

    @Override
    public CellStyle createInfoDescriptionCellStyle() {
        return createColoredTextCellStyle(InfoCellColor);
    }

    @Override
    public CellStyle createEmptyCellStyle() {
        HSSFCellStyle style = _workbook.createCellStyle();
        style.setFillForegroundColor(AutomaticCellColor.getIndex());
        style.setFillBackgroundColor(AutomaticCellColor.getIndex());
        return style;
    }

    @Override
    public void populateCellWithHyperlink(Cell cell, String url, String label) {
        Hyperlink link = createHyperlink(url, label);
        cell.setCellValue(label);
        cell.setHyperlink((HSSFHyperlink) link);
        CellStyle cellStyle = createColoredTextCellStyle(InfoCellColor);
        cell.setCellStyle(cellStyle);
    }

    private CellStyle createBackgroundCellStyle(HSSFColorPredefined color) {
        // reuse the cell styles as XLS format has limit 4000 different cell styles for one document
        if (backgroundCellStyles.containsKey(color.getIndex())) {
            return backgroundCellStyles.get(color.getIndex());
        }
        HSSFCellStyle style = _workbook.createCellStyle();
        style.setFillForegroundColor(color.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        backgroundCellStyles.put(color.getIndex(), style);
        return style;
    }

    private CellStyle createColoredTextCellStyle(HSSFColorPredefined textColor) {
        // reuse the cell styles as XLS format has limit 4000 different cell styles for one document
        if (coloredTextCellStyles.containsKey(textColor.getIndex())) {
            return coloredTextCellStyles.get(textColor.getIndex());
        }
        CellStyle style = _workbook.createCellStyle();
        HSSFFont font = _workbook.createFont();
        font.setColor(textColor.getIndex());
        font.setItalic(true);
        style.setFont(font);
        coloredTextCellStyles.put(textColor.getIndex(), style);
        return style;
    }
}

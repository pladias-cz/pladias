package service.excel.impl;

import org.apache.poi.common.usermodel.Hyperlink;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.*;

public class XSSFWorkbookWrapper extends WorkbookWrapper {
    private final XSSFWorkbook _workbook;

    private final XSSFColor ErrorColor = new XSSFColor(new java.awt.Color(255, 102, 0));
    private final XSSFColor InfoColor = new XSSFColor(new java.awt.Color(50, 120, 235));
    private final XSSFColor WarningColor = new XSSFColor(new java.awt.Color(153, 204, 0));
    private final XSSFColor BlueColor = new XSSFColor(new java.awt.Color(0, 0, 255));

    private final XSSFColor DefaultColor = new XSSFColor(new java.awt.Color(255, 255, 255));

    public XSSFWorkbookWrapper(XSSFWorkbook workbook, String filename) {
        super(filename);

        if (workbook == null) {
            throw new IllegalArgumentException("workbook");
        }
        _workbook = workbook;
    }

    @Override
    public Workbook getWorkbook() {
        return _workbook;
    }

    @Override
    public CellStyle createErrorBackgroundCellStyle() {
        return createBackgroundCellStype(ErrorColor);
    }

    @Override
    public CellStyle createInfoBackgroundCellStyle() {
        return createBackgroundCellStype(InfoColor);
    }

    @Override
    public CellStyle createWarningBackgroundCellStyle() {
        return createBackgroundCellStype(WarningColor);
    }

    @Override
    public CellStyle createErrorDescriptionCellStyle() {
        return createDescriptionCellStype(ErrorColor);
    }

    @Override
    public CellStyle createInfoDescriptionCellStyle() {
        return createDescriptionCellStype(InfoColor);
    }

    @Override
    public CellStyle createWarningDescriptionCellStyle() {
        return createDescriptionCellStype(WarningColor);
    }

    @Override
    public CellStyle createEmptyCellStyle() {
        XSSFCellStyle style = _workbook.createCellStyle();
        style.setFillForegroundColor(DefaultColor);
        return style;
    }

    private XSSFCellStyle createDescriptionCellStype(XSSFColor color) {
        XSSFCellStyle style = _workbook.createCellStyle();
        XSSFFont font = _workbook.createFont();
        font.setColor(color);
        font.setItalic(true);
        style.setFont(font);
        return style;
    }

    private XSSFCellStyle createBackgroundCellStype(XSSFColor color) {
        XSSFCellStyle style = _workbook.createCellStyle();
        style.setFillForegroundColor(color);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    @Override
    public void populateCellWithHyperlink(Cell cell, String url, String label) {
        Hyperlink link = createHyperlink(url, label);
        cell.setCellValue(label);
        cell.setHyperlink((XSSFHyperlink) link);
        CellStyle cellStyle = createDescriptionCellStype(BlueColor);
        cell.setCellStyle(cellStyle);
    }
}

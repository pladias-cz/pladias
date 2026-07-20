package service.excel.impl;

import excel.UpdateEntryInfo;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ooxml.POIXMLProperties;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.openxmlformats.schemas.officeDocument.x2006.customProperties.CTProperty;
import service.excel.ParsedRecordDetails;

import java.text.NumberFormat;
import java.text.ParseException;
import java.util.Locale;

public class ExcelDocHelper {

    //TODO: make this configurable based on project settings
    static NumberFormat format = NumberFormat.getInstance(Locale.FRANCE);

    private ExcelDocHelper() {
    }

    public static Float getSafeCellFloatValue(Row row, int columnId) {
        String value = getSafeCellStringValue(row, columnId);

        if (value == null) {
            return null;
        }
        Float result = null;
        try {
            Number number = format.parse(value);
            result = number.floatValue();
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return result;
    }

    public static Double getSafeCellNumericValue(Row row, int columnId) {
        if (row == null)
            return null;

        Cell cell = row.getCell(columnId);
        if (cell == null) {
            return null;
        }

        cell.setCellType(CellType.NUMERIC);
        return cell.getNumericCellValue();
    }

    public static String getSafeCellStringValue(Row row, int columnId) {
        if (row == null)
            return null;

        Cell cell = row.getCell(columnId);

        if (cell == null) {
            return null;
        }

        cell.setCellType(CellType.STRING);
        String result = cell.getStringCellValue();
        if (result != null) {
            result = result.trim();
        }
        return result;
    }

    public static void setCellStringValue(Sheet sheet, int rowId, int columnId, String value) {
        Row row = sheet.getRow(rowId);
        if (row == null)
            return;

        Cell cell = CellUtil.getCell(row, columnId);
        if (cell == null)
            return;

        cell.setCellType(CellType.STRING);
        cell.setCellValue(value);
    }


    public static ExcelFileVersion getCategory(Workbook workbook) {
        if (workbook instanceof XSSFWorkbook hssf) {
            POIXMLProperties properties = hssf.getProperties();
            CTProperty category = properties.getCustomProperties().getProperty("category");
            String version = (category != null)
                ? category.getLpwstr() //this is needed for OpenOffice
                : properties.getCoreProperties().getCategory(); //this is how we read category for MS Excel

            return ExcelFileVersion.valueOfVersion(version);
        } else if (workbook instanceof HSSFWorkbook hssf) {
            String version = hssf.getDocumentSummaryInformation().getCategory();
            return ExcelFileVersion.valueOfVersion(version);
        }
        return ExcelFileVersion.UNKNOWN;
    }

    public static void populateExcelSheet(Sheet sheet, Iterable<ParsedRecordDetails> wrappers) {
        for (ParsedRecordDetails wrapper : wrappers) {
            for (UpdateEntryInfo update : wrapper.getUpdates()) {
                ExcelDocHelper.setCellStringValue(sheet, (int) update.getRow(), update.getColumn(), update.getText());
            }
        }
    }
}

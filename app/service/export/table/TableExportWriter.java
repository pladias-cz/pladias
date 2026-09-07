package service.export.table;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import play.i18n.Messages;
import play.mvc.Http;
import utils.ExcelUtils;

import java.io.IOException;
import java.sql.Timestamp;
import java.util.List;

/**
 * Writes a list of DTOs into an XLSX workbook described by {@link ExportColumn} definitions.
 *
 * <p>Intended for the exports of React datatables: the request is answered by the same endpoint
 * as the JSON list, the client only asks for {@value #XlsxMimeType} in the {@code Accept} header
 * (see {@link #acceptsXlsx(Http.Request)}) and omits pagination to receive all rows.</p>
 */
public class TableExportWriter {

    public static final String XlsxMimeType
        = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private static final String DateFormat = "dd.MM.yyyy HH:mm";
    // Column auto-sizing measures every cell, it is too slow for large exports
    private static final int AutoSizeRowLimit = 1000;

    private TableExportWriter() {
    }

    /**
     * Whether the client requested the XLSX variant of the endpoint it calls.
     */
    public static boolean acceptsXlsx(Http.Request request) {
        return request.headers().get("Accept").orElse("").contains(XlsxMimeType);
    }

    public static <T> byte[] write(String sheetName, List<ExportColumn<T>> columns, List<T> rows,
                                   Messages messages) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(sheetName);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.setDataFormat(workbook.getCreationHelper().createDataFormat().getFormat(DateFormat));

            Row header = sheet.createRow(0);
            for (int i = 0; i < columns.size(); i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(messages.at(columns.get(i).headerKey()));
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 1;
            for (T row : rows) {
                Row sheetRow = sheet.createRow(rowIndex++);
                for (int i = 0; i < columns.size(); i++) {
                    populateCell(sheetRow.createCell(i), columns.get(i), row, messages, dateStyle);
                }
            }

            if (rows.size() <= AutoSizeRowLimit) {
                for (int i = 0; i < columns.size(); i++) {
                    sheet.autoSizeColumn(i);
                }
            }

            return ExcelUtils.serializeWorkbook(workbook);
        }
    }

    private static <T> void populateCell(Cell cell, ExportColumn<T> column, T row, Messages messages,
                                         CellStyle dateStyle) {
        Object value = column.value().apply(row);
        if (value == null) {
            cell.setBlank();
            return;
        }
        switch (column.type()) {
            case INTEGER -> cell.setCellValue(((Number) value).longValue());
            case DECIMAL -> cell.setCellValue(((Number) value).doubleValue());
            case BOOLEAN -> cell.setCellValue(messages.at((Boolean) value ? "TableExport.yes" : "TableExport.no"));
            case DATE -> {
                cell.setCellValue((Timestamp) value);
                cell.setCellStyle(dateStyle);
            }
            default -> cell.setCellValue(value.toString());
        }
    }
}

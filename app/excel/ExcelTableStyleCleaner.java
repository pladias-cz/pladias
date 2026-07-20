package excel;

import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import service.excel.IRecordColumnMapper;
import service.excel.impl.ExcelDocHelper;

public class ExcelTableStyleCleaner {

    private final CellStyle m_EmptyStyle;
    private final Sheet m_Sheet;
    private final int m_ColumnCount;
    private final int[] m_ColumnsToReset;

    private final Logger logger = LoggerFactory.getLogger(ExcelTableStyleCleaner.class);

    public ExcelTableStyleCleaner(Sheet sheet, CellStyle emptyCellStyle, int columnCount, int[] columnsToReset) {
        m_EmptyStyle = emptyCellStyle;
        m_Sheet = sheet;
        m_ColumnCount = columnCount;
        m_ColumnsToReset = columnsToReset;
    }

    public void clean(IRecordColumnMapper colMapper) {
        try {
            int currentRow = 1;

            while (true) {
                Row row = m_Sheet.getRow(currentRow++);
                if (isRowEmpty(row)) {
                    break;
                }
                cleanRow(row);
            }
        } catch (Exception e) {
            logger.error("Error during excel cleaning", e);
        }
    }

    private boolean isRowEmpty(Row row) {
        for (int col = 0; col < m_ColumnCount; col++) {
            String value = ExcelDocHelper.getSafeCellStringValue(row, col);
            if (!StringUtils.isBlank(value)) {
                return false;
            }
        }
        return true;
    }

    private void cleanRow(Row row) {
        resetStyles(row);
        deleteMessages(row);
    }

    private void resetStyles(Row row) {
        for (int i = 0; i < m_ColumnCount; i++) {
            Cell cell = row.getCell(i);
            if (cell != null) {
                cell.setCellStyle(m_EmptyStyle);
            }
        }
    }

    private void deleteMessages(Row row) {
        for (int column : m_ColumnsToReset) {
            Cell cell = row.getCell(column);
            if (cell != null) {
                cell.setCellValue("");
            }
        }
    }
}

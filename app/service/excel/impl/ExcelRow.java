package service.excel.impl;

import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import service.excel.IRow;

import java.util.Iterator;

public class ExcelRow implements IRow {

    private final Row row;

    public ExcelRow(Row row) {
        this.row = row;
    }

    @Override
    public String getValue(int column) {
        return ExcelDocHelper.getSafeCellStringValue(row, column);
    }

    @Override
    public long getRowNum() {
        return row.getRowNum();
    }

    public boolean isEmpty() {
        if (row == null) {
            return true;
        }

        Iterator<Cell> iterator = row.cellIterator();
        while (iterator.hasNext()) {
            Cell cell = iterator.next();
            String value = cell.getStringCellValue();

            if (StringUtils.isNotEmpty(value)) {
                return false;
            }
        }
        return true;
    }

    @Override
    public Iterator<String> getValues() {
        throw new IllegalStateException("Not implemented");
    }
}

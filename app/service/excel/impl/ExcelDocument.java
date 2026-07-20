package service.excel.impl;

import org.apache.poi.ss.usermodel.Sheet;
import service.excel.IDocument;
import service.excel.IRow;

import java.util.List;
import java.util.NoSuchElementException;

public class ExcelDocument implements IDocument {

    private final Sheet sheet;
    private int currentRow = 1;

    public ExcelDocument(Sheet sheet) {
        this.sheet = sheet;
    }

    @Override
    public boolean hasMoreElements() {
        ExcelRow excelRow = new ExcelRow(sheet.getRow(currentRow));
        return !excelRow.isEmpty();
    }

    @Override
    public IRow nextElement() {
        ExcelRow row = new ExcelRow(sheet.getRow(currentRow++));
        if (row.isEmpty()) {
            throw new NoSuchElementException();
        }
        return row;
    }

    @Override
    public void close() {
        //no op
    }

    @Override
    public List<String> getHeaders() {
        throw new IllegalStateException("not implemented");
    }

}

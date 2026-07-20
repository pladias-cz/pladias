package service.csv;

import org.apache.commons.csv.CSVRecord;
import service.excel.IRow;

import java.util.Iterator;

public class CSVRow implements IRow {

    private final CSVRecord record;

    public CSVRow(CSVRecord record) {
        this.record = record;
    }

    @Override
    public String getValue(int column) {
        return record.get(column);
    }

    @Override
    public long getRowNum() {
        return record.getRecordNumber();
    }

    public Iterator<String> getValues() {
        return record.iterator();
    }
}

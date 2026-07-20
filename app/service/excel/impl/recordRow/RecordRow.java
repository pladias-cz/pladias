package service.excel.impl.recordRow;

import java.util.HashMap;
import java.util.Map;

public class RecordRow {

    private final Map<Integer, String> map;
    private long rowNumber;

    public RecordRow() {
        map = new HashMap<Integer, String>();
    }

    public String get(int key) {
        String result = map.get(key);
        return (result != null) ? result : "";
    }

    public long getRowNumber() {
        return rowNumber;
    }

    void setRowNumber(long rowNumber) {
        this.rowNumber = rowNumber;
    }

    public void put(int key, String value) {
        map.put(key, value);
    }


}

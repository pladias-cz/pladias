package service.excel.impl.recordRow;

import org.apache.commons.lang3.StringUtils;
import service.excel.IRecordColumnMapper;
import service.excel.IRecordRowParser;
import service.excel.IRow;

import java.util.HashMap;
import java.util.Map;

public abstract class DocumentRowParserBase implements IRecordRowParser, IRecordColumnMapper {
    private final Map<String, Integer> columnMap = new HashMap<String, Integer>();

    public DocumentRowParserBase() {
        initCommonColumnMapping(columnMap);
        initSpecificColumnMapping(columnMap);
    }

    abstract protected void initCommonColumnMapping(Map<String, Integer> map);

    abstract protected void initSpecificColumnMapping(Map<String, Integer> map);

    abstract protected String[] getRequiredColumnIds();

    @Override
    public int getColumn(String columnId) {
        return columnMap.get(columnId);
    }

    @Override
    public boolean containsColumn(String columnId) {
        return columnMap.containsKey(columnId);
    }

    @Override
    public boolean isEmpty(IRow row) {
        for (String columnId : getRequiredColumnIds()) {
            int column = getColumn(columnId);
            String keyValue = row.getValue(column);
            if (org.apache.commons.lang3.StringUtils.isNotEmpty(keyValue)) {
                return false;
            }
        }
        return true;
    }

    protected void processField(RecordRow recordRow, IRow row, String sourceColumnId) {
        int column = getColumn(sourceColumnId);
        String value = row.getValue(column);
        value = StringUtils.defaultString(value);
        recordRow.put(column, value.trim());
    }
}

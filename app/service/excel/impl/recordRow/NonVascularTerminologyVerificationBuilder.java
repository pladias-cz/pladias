package service.excel.impl.recordRow;

import service.excel.IExcelTableColumns;
import service.excel.IRow;

import java.util.Map;

public class NonVascularTerminologyVerificationBuilder extends DocumentRowParserBase {

    private static final String[] requiredColumnIds = new String[]
        {
            IExcelTableColumns.TAXON_COLUMN_ID
        };

    @Override
    protected String[] getRequiredColumnIds() {
        return requiredColumnIds;
    }

    @Override
    public RecordRow build(IRow row) {
        RecordRow recordRow = new RecordRow();
        processField(recordRow, row, IExcelTableColumns.TAXON_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID);
        recordRow.setRowNumber(row.getRowNum());
        return recordRow;
    }

    @Override
    protected void initCommonColumnMapping(Map<String, Integer> map) {
        map.put(IExcelTableColumns.TAXON_COLUMN_ID, 0);
        map.put(IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID, 1);

        map.put(IExcelTableColumns.ERROR_REPORT_COLUMN_ID, 20);
        map.put(IExcelTableColumns.INFO_REPORT_COLUMN_ID, 21);
        map.put(IExcelTableColumns.WARNING_REPORT_COLUMN_ID, 22);
    }

    @Override
    protected void initSpecificColumnMapping(Map<String, Integer> map) {
    }
}

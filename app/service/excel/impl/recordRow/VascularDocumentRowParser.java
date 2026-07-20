package service.excel.impl.recordRow;

import service.excel.IExcelTableColumns;
import service.excel.IRow;

import java.util.Map;

public class VascularDocumentRowParser extends VascularRecordRowBuilderBase {
    @Override
    public RecordRow build(IRow row) {
        RecordRow recordRow = buildBaseRow(row);
        return recordRow;
    }

    @Override
    protected void initSpecificColumnMapping(Map<String, Integer> columnMap) {

        columnMap.put(IExcelTableColumns.PHYTOCHORION_COLUMN_ID, 12);
        columnMap.put(IExcelTableColumns.SQUARE_COLUMN_ID, 13);
        columnMap.put(IExcelTableColumns.COMMENT_COLUMN_ID, 14);

        columnMap.put(IExcelTableColumns.GPS_URL_COLUMN_ID, 15);

        columnMap.put(IExcelTableColumns.ERROR_REPORT_COLUMN_ID, 16);
        columnMap.put(IExcelTableColumns.INFO_REPORT_COLUMN_ID, 17);
        columnMap.put(IExcelTableColumns.WARNING_REPORT_COLUMN_ID, 18);
    }
}

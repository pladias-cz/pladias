package service.excel.impl.recordRow;

import service.excel.IExcelTableColumns;
import service.excel.IRow;

import java.util.Map;

public class VascularDocumentRowParserVer2 extends VascularRecordRowBuilderBase {

    @Override
    public RecordRow build(IRow row) {
        RecordRow recordRow = buildBaseRow(row);

        processField(recordRow, row, IExcelTableColumns.HERBARIUM_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.PHYTOCHORION_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.SQUARE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.COMMENT_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.FOREIGN_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.LICENSE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.GPS_URL_COLUMN_ID);

        return recordRow;
    }

    @Override
    protected void initSpecificColumnMapping(Map<String, Integer> columnMap) {

        columnMap.put(IExcelTableColumns.HERBARIUM_COLUMN_ID, 12);

        columnMap.put(IExcelTableColumns.PHYTOCHORION_COLUMN_ID, 13);
        columnMap.put(IExcelTableColumns.SQUARE_COLUMN_ID, 14);
        columnMap.put(IExcelTableColumns.COMMENT_COLUMN_ID, 15);

        columnMap.put(IExcelTableColumns.FOREIGN_COLUMN_ID, 16);
        columnMap.put(IExcelTableColumns.LICENSE_COLUMN_ID, 17);
        columnMap.put(IExcelTableColumns.GPS_URL_COLUMN_ID, 18);

        columnMap.put(IExcelTableColumns.ERROR_REPORT_COLUMN_ID, 19);
        columnMap.put(IExcelTableColumns.INFO_REPORT_COLUMN_ID, 20);
        columnMap.put(IExcelTableColumns.WARNING_REPORT_COLUMN_ID, 21);
    }

}

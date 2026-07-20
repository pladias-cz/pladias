package service.excel.impl.recordRow;

import service.excel.IExcelTableColumns;
import service.excel.IRow;

import java.util.Map;

public class VascularDocumentRowParserVer3 extends VascularDocumentRowParserVer2 {

    @Override
    public RecordRow build(IRow row) {
        RecordRow recordRow = super.build(row);

        processField(recordRow, row, IExcelTableColumns.DETREV_ID);

        processField(recordRow, row, IExcelTableColumns.REMARK_EXCERPTION_ID);
        processField(recordRow, row, IExcelTableColumns.REMARK_OTHER_ID);
        processField(recordRow, row, IExcelTableColumns.REMARK_DOUBT_ID);

        processField(recordRow, row, IExcelTableColumns.ENVIRONMENT_ID);

        return recordRow;
    }

    @Override
    protected void initSpecificColumnMapping(Map<String, Integer> columnMap) {
        super.initSpecificColumnMapping(columnMap);
        //we are deliberately overwriting columns 19 - 23 that were dedicated to
        //ERROR, INFO and WARNING output messages

        columnMap.put(IExcelTableColumns.DETREV_ID, 18);

        columnMap.put(IExcelTableColumns.REMARK_EXCERPTION_ID, 19);

        columnMap.put(IExcelTableColumns.REMARK_OTHER_ID, 20);
        columnMap.put(IExcelTableColumns.REMARK_DOUBT_ID, 21);

        columnMap.put(IExcelTableColumns.ENVIRONMENT_ID, 22);

        columnMap.put(IExcelTableColumns.GPS_URL_COLUMN_ID, 23);
        //these three columns must always stand at the end of the table
        columnMap.put(IExcelTableColumns.ERROR_REPORT_COLUMN_ID, 24);
        columnMap.put(IExcelTableColumns.INFO_REPORT_COLUMN_ID, 25);
        columnMap.put(IExcelTableColumns.WARNING_REPORT_COLUMN_ID, 26);
    }
}

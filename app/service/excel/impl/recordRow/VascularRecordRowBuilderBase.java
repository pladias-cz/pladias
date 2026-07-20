package service.excel.impl.recordRow;

import service.excel.IExcelTableColumns;
import service.excel.IRow;

import java.util.Map;

public abstract class VascularRecordRowBuilderBase extends DocumentRowParserBase {
    private static final String[] requiredColumnIds = new String[]
        {
            IExcelTableColumns.TAXON_COLUMN_ID, IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID,
            IExcelTableColumns.LOCALITY_COLUMN_ID, IExcelTableColumns.NEAREST_TOWN_COLUMN_ID,
            IExcelTableColumns.DISTRICT_COLUMN_ID
        };

    @Override
    protected String[] getRequiredColumnIds() {

        return requiredColumnIds;
    }

    protected RecordRow buildBaseRow(IRow row) {
        RecordRow recordRow = new RecordRow();

        processField(recordRow, row, IExcelTableColumns.SOURCE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.LOCALITY_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.COMMENT_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.FINDER_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.DATE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.TAXON_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.DISTRICT_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.NEAREST_TOWN_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.ALTITUDE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.GPS_COORDS_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.GPS_COORDS_SOURCE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.GPS_COORDS_PRECISION_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.PHYTOCHORION_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.SQUARE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.COMMENT_COLUMN_ID);


        recordRow.setRowNumber(row.getRowNum());

        return recordRow;
    }

    @Override
    protected void initCommonColumnMapping(Map<String, Integer> map) {
        map.put(IExcelTableColumns.TAXON_COLUMN_ID, 0);
        map.put(IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID, 1);
        map.put(IExcelTableColumns.LOCALITY_COLUMN_ID, 2);
        map.put(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID, 3);
        map.put(IExcelTableColumns.DISTRICT_COLUMN_ID, 4);
        map.put(IExcelTableColumns.ALTITUDE_COLUMN_ID, 5);
        map.put(IExcelTableColumns.GPS_COORDS_COLUMN_ID, 6);

        map.put(IExcelTableColumns.GPS_COORDS_SOURCE_COLUMN_ID, 7);
        map.put(IExcelTableColumns.GPS_COORDS_PRECISION_COLUMN_ID, 8);
        map.put(IExcelTableColumns.DATE_COLUMN_ID, 9);
        map.put(IExcelTableColumns.FINDER_COLUMN_ID, 10);
        map.put(IExcelTableColumns.SOURCE_COLUMN_ID, 11);
    }
}

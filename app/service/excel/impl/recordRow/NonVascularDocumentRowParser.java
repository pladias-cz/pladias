package service.excel.impl.recordRow;

import service.excel.IExcelTableColumns;
import service.excel.IRow;

import java.util.Map;

public class NonVascularDocumentRowParser extends DocumentRowParserBase {

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
        processField(recordRow, row, IExcelTableColumns.LOCALITY_AUXILIARY_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.LOCALITY_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.ALTITUDE_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.GPS_COORDS_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.GPS_COORDS_SOURCE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.GPS_COORDS_PRECISION_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.SUBSTRATE_NOTE_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.DATE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.FINDER_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.SOURCE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.HERBARIUM_COLUMN_ID);

        processField(recordRow, row, IExcelTableColumns.FOREIGN_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.LICENSE_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.COMMENT_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.CHEMICAL_DATA_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.SUBSTRATE1_COLUMN_ID);
        processField(recordRow, row, IExcelTableColumns.SUBSTRATE2_COLUMN_ID);

        recordRow.setRowNumber(row.getRowNum());

        return recordRow;
    }

    @Override
    protected void initCommonColumnMapping(Map<String, Integer> map) {
        map.put(IExcelTableColumns.TAXON_COLUMN_ID, 0);
        map.put(IExcelTableColumns.ORIGINAL_NAME_COLUMN_ID, 1);
        map.put(IExcelTableColumns.LOCALITY_AUXILIARY_COLUMN_ID, 2);

        map.put(IExcelTableColumns.LOCALITY_COLUMN_ID, 3);
        map.put(IExcelTableColumns.ALTITUDE_COLUMN_ID, 4);
        map.put(IExcelTableColumns.GPS_COORDS_COLUMN_ID, 5);

        map.put(IExcelTableColumns.GPS_COORDS_SOURCE_COLUMN_ID, 6);
        map.put(IExcelTableColumns.GPS_COORDS_PRECISION_COLUMN_ID, 7);
        map.put(IExcelTableColumns.SUBSTRATE_NOTE_COLUMN_ID, 8);

        map.put(IExcelTableColumns.DATE_COLUMN_ID, 9);
        map.put(IExcelTableColumns.FINDER_COLUMN_ID, 10);

        map.put(IExcelTableColumns.SOURCE_COLUMN_ID, 11);
        map.put(IExcelTableColumns.HERBARIUM_COLUMN_ID, 12);
        map.put(IExcelTableColumns.FOREIGN_COLUMN_ID, 13);
        map.put(IExcelTableColumns.LICENSE_COLUMN_ID, 14);
        map.put(IExcelTableColumns.COMMENT_COLUMN_ID, 15);

        map.put(IExcelTableColumns.CHEMICAL_DATA_COLUMN_ID, 16);
        map.put(IExcelTableColumns.SUBSTRATE1_COLUMN_ID, 17);
        map.put(IExcelTableColumns.SUBSTRATE2_COLUMN_ID, 18);
        map.put(IExcelTableColumns.GPS_URL_COLUMN_ID, 19);

        map.put(IExcelTableColumns.ERROR_REPORT_COLUMN_ID, 20);
        map.put(IExcelTableColumns.INFO_REPORT_COLUMN_ID, 21);
        map.put(IExcelTableColumns.WARNING_REPORT_COLUMN_ID, 22);
    }

    @Override
    protected void initSpecificColumnMapping(Map<String, Integer> map) {
    }

}

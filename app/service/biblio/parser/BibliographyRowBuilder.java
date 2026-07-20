package service.biblio.parser;

import models.biblio.Bibliography;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.usermodel.Row;
import service.excel.impl.ExcelDocHelper;

public class BibliographyRowBuilder {

    public static boolean isEmpty(Row row) {
        int[] columnIds = new int[]{
            IBiblioExcelTableColumns.AUTHORS,
            IBiblioExcelTableColumns.YEAR,
            IBiblioExcelTableColumns.TITLE
        };
        for (int i = 0; i < columnIds.length; i++) {
            String keyValue = ExcelDocHelper.getSafeCellStringValue(row, i);
            if (keyValue != null && !"".equals(keyValue.trim())) {
                return false;
            }
        }
        return true;
    }

    public static Bibliography build(Row row) {
        Bibliography b = new Bibliography();
        b.setOriginalSourceKey(retrieveString(row, IBiblioExcelTableColumns.ORIGINAL_STRING));
        b.setAuthors(retrieveString(row, IBiblioExcelTableColumns.AUTHORS));

        Long year = retrieveLong(row, IBiblioExcelTableColumns.YEAR);
        b.setYear(year != null ? year.intValue() : null);

        b.setTitle(retrieveString(row, IBiblioExcelTableColumns.TITLE));
        b.setEtc(retrieveString(row, IBiblioExcelTableColumns.ETC));
        b.setRemarks(retrieveString(row, IBiblioExcelTableColumns.REMARKS));
        b.setOriginalId(retrieveLong(row, IBiblioExcelTableColumns.ORIGINAL_ID));
        b.setExcerpted(retrieveBool(row, IBiblioExcelTableColumns.EXCERPTED));
        b.setJournal(retrieveString(row, IBiblioExcelTableColumns.JOURNAL));
        b.setJournalId(retrieveString(row, IBiblioExcelTableColumns.JOURNAL_ID));
        return b;
    }

    private static Long retrieveLong(Row row, int columnId) {
        Double value = ExcelDocHelper.getSafeCellNumericValue(row, columnId);
        if (value != null)
            return value.longValue();

        return null;
    }

    private static boolean retrieveBool(Row row, int columnId) {
        String value = ExcelDocHelper.getSafeCellStringValue(row, columnId);
        return Boolean.parseBoolean(value);
    }

    private static String retrieveString(Row row, int columnId) {
        String data = ExcelDocHelper.getSafeCellStringValue(row, columnId);
        return StringUtils.defaultIfBlank(data, "");
    }
}

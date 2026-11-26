package service.record.serialization;

import excel.ExcelLinePopulator;
import org.apache.commons.io.FileUtils;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.search.PageSearchResults;
import utils.ConfigHelper;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

public class PageSearchResultSerialization {
    final static Logger logger = LoggerFactory.getLogger(PageSearchResultSerialization.class);
    final static int MaxAutosizeCollectionSize = 300;
    final static int RowAccessWindowSize = 500;
    final static String WorkbookTempFilePrefix = "pladias_records_export_";
    final static String WorkbookTempFileSuffix = ".xlsx";

    /**
     * Výsledek zápisu sešitu: dočasný soubor s hotovými daty a počet opravdu
     * zapsaných řádků (může být nižší než počet nabídnutých – viz writeSheet).
     * Volající je odpovědný za smazání souboru.
     */
    public record ExportedWorkbook(File file, int exportedRows) {
    }

    /**
     * Zapíše sešit do dočasného souboru DŘÍVE, než volající sestaví HTTP
     * odpověď. Selhání tak vyjde najevo včas a může se navenek projevit jako
     * chybová odpověď – ne jako platně vypadající soubor s nulovou velikostí
     * (docs/gotchas.md – „validní sešit bez dat").
     */
    public static ExportedWorkbook writeWorkbook(List<PageSearchResults.Row> rows) throws IOException {
        File target = File.createTempFile(WorkbookTempFilePrefix, WorkbookTempFileSuffix);
        int exportedRows;
        try (SXSSFWorkbook wb = new SXSSFWorkbook(RowAccessWindowSize);
             FileOutputStream outputStream = new FileOutputStream(target)) {
            wb.setCompressTempFiles(true);
            exportedRows = writeSheet(rows, wb);
            logger.info("Serializing workbook with " + exportedRows + " records");
            wb.write(outputStream);
            outputStream.flush();
        } catch (Exception e) {
            logger.error("Error during record export", e);
            FileUtils.deleteQuietly(target);
            throw new IOException("Excel export se nezdařil", e);
        }
        return new ExportedWorkbook(target, exportedRows);
    }

    /**
     * Zapíše hlavičky a data do listu. Řádek, jehož data se nepodařila
     * připravit, se vynechá a zápis pokračuje dál – jeden špatný záznam nesmí
     * shodit celý export; počet vynechaných řádků jde do logu.
     */
    private static int writeSheet(List<PageSearchResults.Row> rows, SXSSFWorkbook wb) {
        SXSSFSheet sheet = wb.createSheet();

        ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(ConfigHelper.isNonVascular());
        boolean autoSize = shouldAutosize(rows);

        if (autoSize) {
            sheet.trackAllColumnsForAutoSizing();
        }

        int index = 0;
        ExcelLinePopulator.populate(sheet.createRow(index++), generator.getRecordHeaders());

        int writtenRows = 0;
        int skippedRows = 0;
        for (PageSearchResults.Row r : rows) {
            try {
                List<String> fields = generator.prepareRecordFields(r);
                ExcelLinePopulator.populate(sheet.createRow(index++), fields);
                writtenRows++;
                if (writtenRows % 1000 == 0)
                    logger.info("Serialized " + writtenRows + " records");
            } catch (Exception e) {
                skippedRows++;
                logger.error("Skipping record " + r.getRecordId() + " during record export", e);
            }
        }
        if (skippedRows > 0) {
            logger.warn("Excel export skipped " + skippedRows + " of " + rows.size() + " records");
        }

        if (autoSize) {
            autosize(sheet, generator);
        }

        return writtenRows;
    }

    private static boolean shouldAutosize(List<PageSearchResults.Row> rows) {
        return rows.size() < MaxAutosizeCollectionSize;
    }

    private static void autosize(Sheet sheet, ISearchTableDataGenerator generator) {
        for (int i = 0; i < generator.getFieldsCount(); i++) {
            logger.info("Autosize for column " + i);
            sheet.autoSizeColumn(i);
        }
    }
}

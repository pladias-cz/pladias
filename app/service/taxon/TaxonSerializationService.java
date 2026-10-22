package service.taxon;

import excel.ExcelLinePopulator;
import models.Taxon;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import serializers.CsvSerializer;
import utils.ExcelUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

public class TaxonSerializationService {

    public static byte[] serialize(List<Taxon> taxons) throws IOException {
        TaxonCsvGenerator generator = new TaxonCsvGenerator();

        try (ByteArrayOutputStream bas = new ByteArrayOutputStream()) {
            try (CsvSerializer serializer = new CsvSerializer(bas)) {
                List<String> headers = generator.getTaxonHeaders();
                serializer.printLine(headers);
                for (Taxon t : taxons) {
                    List<String> fields = generator.prepareTaxonFields(t);
                    serializer.printLine(fields);
                }
            }
            return bas.toByteArray();
        }
    }

    /**
     * XLSX export se sloupci i hodnotami shodnými s CSV exportem
     * ({@link TaxonCsvGenerator}); slouží dynamickému downloadu na /downloads.
     * Sloupce se nepřizpůsobují obsahu u velkých exportů (vzoru
     * TableExportWriter – auto-size měří každou buňku a je příliš pomalý).
     */
    public static byte[] serializeExcel(List<Taxon> taxons) throws IOException {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet();
            TaxonCsvGenerator generator = new TaxonCsvGenerator();
            List<String> headers = generator.getTaxonHeaders();

            int index = 0;
            ExcelLinePopulator.populate(sheet.createRow(index++), headers);
            for (Taxon t : taxons) {
                ExcelLinePopulator.populate(sheet.createRow(index++), generator.prepareTaxonFields(t));
            }

            if (taxons.size() <= 1000) {
                for (int i = 0; i < headers.size(); i++) {
                    sheet.autoSizeColumn(i);
                }
            }

            return ExcelUtils.serializeWorkbook(wb);
        }
    }
}


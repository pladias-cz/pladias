package service.biblio.parser;

import models.biblio.Bibliography;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import play.Logger;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class BiblioParserService {

    public List<Bibliography> parse(Sheet sheet) throws IOException {
        Logger.info("Starting biblio excel parse service.");
        List<Bibliography> items = new ArrayList<Bibliography>();
        try {
            int currentRow = 1;

            while (true) {
                Row row = sheet.getRow(currentRow++);
                if (BibliographyRowBuilder.isEmpty(row)) {
                    break;
                }
                Bibliography entry = BibliographyRowBuilder.build(row);
                items.add(entry);
            }
            Logger.info("Completing biblio excel parse service.");
        } catch (Exception e) {
            throw new IOException(e);
        }

        return items;
    }
}

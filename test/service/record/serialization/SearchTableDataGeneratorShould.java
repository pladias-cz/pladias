package service.record.serialization;

import org.junit.Test;
import service.search.PageSearchResults;

import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

/**
 * Excel export výsledku vyhledávání musí fungovat v obou typech instance.
 * Pro necevnatou instanci se dlouho volala továrna, která jen hodila
 * {@code UnsupportedOperationException} – export se pak navenek tvářil jako
 * úspěšné stažení prázdného souboru (docs/gotchas.md). Test hlídá, že
 * necevnatý generátor existuje, a že hlavičky sedí s počtem hodnot řádku
 * (posun sloupců se v sešitu projeví až v exportu samotném).
 */
public class SearchTableDataGeneratorShould {

    private static final int VASCULAR_COLUMN_COUNT = 23;

    private PageSearchResults.Row row(String localityExtra, String substrate,
                                      String substrate1, String substrate2, String chemicalData) {
        return new PageSearchResults.Row(
            42L,
            "Cladonia foliacea",
            "Cladonia foliacea (Hoffm.) Schäret & V.J. Cooper",
            "pod skalou",
            "Blansko",
            "512",
            "Blansko",
            49.3530,
            16.6413,
            "terénní měření",
            10,
            "2024-08-15",
            "Novák P.",
            "Nález v terénu",
            "BRNM",
            "3820",
            "1. Česka křovinatá a luční nížina",
            "hojně",
            "přezkoumáno k good",
            "původní",
            "KAM",
            "332-11",
            "CC-BY-NC 4.0",
            "Novák, Petr",
            localityExtra,
            substrate,
            substrate1,
            substrate2,
            chemicalData
        );
    }

    @Test
    public void createGeneratorForNonVascularInstance() {
        ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(true);

        assertTrue(generator instanceof SearchTableDataGeneratorNonVascular);
    }

    @Test
    public void keepVascularGeneratorUnchanged() {
        ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(false);

        assertEquals(VASCULAR_COLUMN_COUNT, generator.getRecordHeaders().size());
        assertEquals(VASCULAR_COLUMN_COUNT, generator.prepareRecordFields(row(null, null, null, null, null)).size());
        assertFalse(generator.getRecordHeaders().contains("substrát"));
    }

    @Test
    public void offerExtensionColumnsAfterTheCommonOnes() {
        ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(true);
        List<String> headers = generator.getRecordHeaders();
        List<String> fields = generator.prepareRecordFields(row("u cesty", "kůra", "kůra stromů", "kůra jehličnanů", "pH 5.5"));

        assertEquals(VASCULAR_COLUMN_COUNT + 5, headers.size());
        // hlavičky, hodnoty i getFieldsCount musí jít ruku v ruce, jinak se
        // export posune o sloupec
        assertEquals(headers.size(), fields.size());
        assertEquals(headers.size(), generator.getFieldsCount());

        assertEquals(headers.subList(VASCULAR_COLUMN_COUNT, headers.size()),
            List.of("lokalita pomocná", "substrát", "substrát 1", "substrát 2", "chemická data"));
        assertEquals(fields.subList(VASCULAR_COLUMN_COUNT, fields.size()),
            List.of("u cesty", "kůra", "kůra stromů", "kůra jehličnanů", "pH 5.5"));
    }

    @Test
    public void exportCommonColumnsToo() {
        ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(true);
        List<String> fields = generator.prepareRecordFields(row(null, null, null, null, null));

        assertEquals("42", fields.get(0));
        assertEquals("Cladonia foliacea", fields.get(1));
        assertEquals("původní", fields.get(19));
        assertEquals("332-11", fields.get(22));
    }

    @Test
    public void replaceMissingExtensionValuesWithEmptyStrings() {
        ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(true);
        List<String> fields = generator.prepareRecordFields(row(null, null, null, null, null));

        // null by se do sešitu zapsal jako text „null"
        for (int index = VASCULAR_COLUMN_COUNT; index < fields.size(); index++) {
            assertEquals("", fields.get(index));
        }
    }

    @Test
    public void autofitUsesTheExtensionColumnCount() {
        ISearchTableDataGenerator generator = RecordTableDataFactory.createSearchTableDataGenerator(true);

        // getFieldsCount řídí autosize nad sloupci – nesmí zůstat na cevnatém počtu
        assertTrue(generator.getFieldsCount() > VASCULAR_COLUMN_COUNT);
    }
}

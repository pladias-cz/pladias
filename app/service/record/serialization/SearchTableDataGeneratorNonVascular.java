package service.record.serialization;

import service.search.PageSearchResults;

import java.util.List;

/**
 * Sloupecový generátor výsledku vyhledávání pro necevnatou instanci – stejné
 * sloupce jako cevnatý výpis plus necevnatá rozšíření z
 * {@code atlas_nonvascular.records_extension}. Pořadí rozšíření odpovídá
 * {@link ExtendedRecordTableDataGeneratorNonVascular}, aby se export z
 * vyhledávání shodoval s exportem detailu záznamu.
 */
public class SearchTableDataGeneratorNonVascular
    extends SearchTableDataGenerator {

    public SearchTableDataGeneratorNonVascular() {
        super();
        extendRecordHeaders();
    }

    @Override
    public List<String> prepareRecordFields(PageSearchResults.Row r) {
        List<String> list = super.prepareRecordFields(r);

        list.add(guardNullValue(r.getLocalityExtra()));
        list.add(guardNullValue(r.getSubstrate()));
        list.add(guardNullValue(r.getSubstrate1()));
        list.add(guardNullValue(r.getSubstrate2()));
        list.add(guardNullValue(r.getChemicalData()));

        return list;
    }

    private void extendRecordHeaders() {
        recordHeaders.add("lokalita pomocná");
        recordHeaders.add("substrát");
        recordHeaders.add("substrát 1");
        recordHeaders.add("substrát 2");
        recordHeaders.add("chemická data");
    }
}

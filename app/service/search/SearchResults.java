package service.search;

import comparators.RecordDateComparator;
import comparators.TaxonLatNameComparator;
import models.Record;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class SearchResults {

    private final int totalCount;
    private final List<Record> records;

    public SearchResults(List<Record> records, int totalCount) {
        this.records = records;
        this.totalCount = totalCount;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public List<Record> getRecords() {
        return records;
    }

    public void sort() {
        Collections.sort(records, new Comparator<Record>() {
            final TaxonLatNameComparator taxonComparator = new TaxonLatNameComparator();
            final RecordDateComparator recordDateComparator = new RecordDateComparator();

            @Override
            public int compare(Record r1, Record r2) {

                int c = taxonComparator.compare(r1.getTaxon(), r2.getTaxon());
                if (c != 0)
                    return c;

                return recordDateComparator.compare(r1, r2);
            }
        });
    }


}

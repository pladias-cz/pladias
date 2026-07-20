package service.record.serialization;

import service.search.PageSearchResults;

import java.util.List;

public interface ISearchTableDataGenerator {
    List<String> getRecordHeaders();

    List<String> prepareRecordFields(PageSearchResults.Row r);

    int getFieldsCount();
}

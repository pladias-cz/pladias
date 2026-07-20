package service.record.serialization;

import models.Record;

import java.util.List;

public interface IRecordTableDataGenerator {
    List<String> getRecordHeaders();

    List<String> prepareRecordFields(Record r);

    int getFieldsCount();
}

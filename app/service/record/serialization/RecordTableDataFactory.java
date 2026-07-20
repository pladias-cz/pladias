package service.record.serialization;

public class RecordTableDataFactory {
    public static IRecordTableDataGenerator createRecordTableDataGenerator(boolean isNonVascular) {
        if (isNonVascular) {
            return new ExtendedRecordTableDataGeneratorNonVascular();
        }
        return new ExtendedRecordTableDataGenerator();
    }

    public static ISearchTableDataGenerator createSearchTableDataGenerator(boolean isNonVascular) {
        if (isNonVascular) {
            throw new UnsupportedOperationException("Non-vascular search table data generator is not implemented yet.");
        }
        return new SearchTableDataGenerator();
    }
}

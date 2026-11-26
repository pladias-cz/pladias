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
            return new SearchTableDataGeneratorNonVascular();
        }
        return new SearchTableDataGenerator();
    }
}

package excel;

public interface IVerifiableRecord {

    ExcelErrorInfo[] getErrors();

    ExcelErrorInfo[] getWarnings();

    ExcelErrorInfo[] getInfos();

    UpdateEntryInfo[] getUpdates();
}

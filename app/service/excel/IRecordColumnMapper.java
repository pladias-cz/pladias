package service.excel;

public interface IRecordColumnMapper {

    int getColumn(String columnId);

    boolean containsColumn(String columnId);
}

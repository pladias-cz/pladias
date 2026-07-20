package service.excel;

import java.util.Iterator;

public interface IRow {

    String getValue(int column);

    Iterator<String> getValues();

    long getRowNum();

}

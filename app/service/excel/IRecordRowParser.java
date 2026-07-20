package service.excel;

import service.excel.impl.recordRow.RecordRow;

public interface IRecordRowParser {
    RecordRow build(IRow row);

    boolean isEmpty(IRow row);
}

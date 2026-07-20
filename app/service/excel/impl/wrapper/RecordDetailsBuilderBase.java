package service.excel.impl.wrapper;

import excel.ExcelErrorInfo;
import play.i18n.Messages;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;
import service.excel.impl.recordRow.RecordRow;

public abstract class RecordDetailsBuilderBase {

    protected IRecordColumnMapper colMapper;
    protected Messages messages;

    public RecordDetailsBuilderBase(IRecordColumnMapper colMapper, Messages messages) {
        this.colMapper = colMapper;
        this.messages = messages;
    }

    protected static ExcelErrorInfo createErrorInfo(RecordRow recordRow, int columnId, String msg) {
        return new ExcelErrorInfo(recordRow.getRowNumber(), columnId, msg);
    }

    public abstract ParsedRecordDetails build(RecordRow recordRow);

}

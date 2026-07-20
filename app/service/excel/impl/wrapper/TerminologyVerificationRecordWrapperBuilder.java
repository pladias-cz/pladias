package service.excel.impl.wrapper;

import excel.ExcelErrorInfo;
import play.i18n.Messages;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;
import service.excel.impl.recordRow.RecordRow;

import java.util.ArrayList;
import java.util.List;

public class TerminologyVerificationRecordWrapperBuilder extends RecordDetailsBuilderBase {

    public TerminologyVerificationRecordWrapperBuilder(IRecordColumnMapper colMapper, Messages messages) {
        super(colMapper, messages);
    }

    @Override
    public ParsedRecordDetails build(RecordRow recordRow) {
        List<ExcelErrorInfo> errors = new ArrayList<ExcelErrorInfo>();
        List<ExcelErrorInfo> warnings = new ArrayList<ExcelErrorInfo>();
        List<ExcelErrorInfo> infos = new ArrayList<ExcelErrorInfo>();

        return new ParsedRecordDetails(null, recordRow, null, errors, warnings, infos);
    }

}

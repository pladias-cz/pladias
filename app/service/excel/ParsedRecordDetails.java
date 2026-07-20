package service.excel;

import excel.ExcelErrorInfo;
import excel.IVerifiableRecord;
import excel.UpdateEntryInfo;
import models.Record;
import models.nonvascular.NonVascularRecordExtension;
import service.excel.impl.recordRow.RecordRow;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class ParsedRecordDetails implements IVerifiableRecord {

    private final Record record;
    private final List<ExcelErrorInfo> errors;
    private final List<ExcelErrorInfo> warnings;
    private final List<ExcelErrorInfo> infos;
    private final List<UpdateEntryInfo> updates;
    private NonVascularRecordExtension nonVascularExtension;

    private final RecordRow recordRow;

    public ParsedRecordDetails(Record item,
                               RecordRow recordRow,
                               NonVascularRecordExtension nonVascularExtension,
                               Collection<ExcelErrorInfo> errors,
                               Collection<ExcelErrorInfo> warnings,
                               Collection<ExcelErrorInfo> infos) {
        this.record = item;
        this.recordRow = recordRow;
        this.nonVascularExtension = nonVascularExtension;
        this.errors = new ArrayList<ExcelErrorInfo>();
        this.warnings = new ArrayList<ExcelErrorInfo>();
        this.infos = new ArrayList<ExcelErrorInfo>();
        this.updates = new ArrayList<UpdateEntryInfo>();

        this.errors.addAll(errors);
        this.warnings.addAll(warnings);
        this.infos.addAll(infos);
    }

    public Record getRecord() {
        return record;
    }

    public NonVascularRecordExtension getNonVascularExtension() {
        return nonVascularExtension;
    }

    public void setNonVascularExtension(NonVascularRecordExtension nonVascularExtension) {
        this.nonVascularExtension = nonVascularExtension;
    }

    public RecordRow getRecordRow() {
        return recordRow;
    }

    public long getRowNumber() {
        return recordRow.getRowNumber();
    }

    public boolean hasErrors() {
        return !errors.isEmpty();
    }

    @Override
    public ExcelErrorInfo[] getErrors() {
        return errors.toArray(new ExcelErrorInfo[errors.size()]);
    }

    @Override
    public ExcelErrorInfo[] getWarnings() {
        return warnings.toArray(new ExcelErrorInfo[warnings.size()]);
    }

    @Override
    public ExcelErrorInfo[] getInfos() {
        return infos.toArray(new ExcelErrorInfo[infos.size()]);
    }

    @Override
    public UpdateEntryInfo[] getUpdates() {
        return updates.toArray(new UpdateEntryInfo[updates.size()]);
    }

    public void addError(ExcelErrorInfo errorInfo) {
        errors.add(errorInfo);
    }

    public void addWarning(ExcelErrorInfo errorInfo) {
        warnings.add(errorInfo);
    }

    public void addInfo(ExcelErrorInfo errorInfo) {
        infos.add(errorInfo);
    }

    public void addUpdate(UpdateEntryInfo update) {
        updates.add(update);
    }
}

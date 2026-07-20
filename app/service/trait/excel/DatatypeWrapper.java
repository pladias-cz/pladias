package service.trait.excel;

import excel.ExcelErrorInfo;
import excel.IVerifiableRecord;
import excel.UpdateEntryInfo;
import io.ebean.*;
import models.traits.ValueComment;

class DatatypeWrapper implements IVerifiableRecord {
    private final Model model;
    private final ValueComment comment;
    private final ExcelErrorInfo[] errors;

    public DatatypeWrapper(Model model, ValueComment comment, ExcelErrorInfo[] errors) {
        this.model = model;
        this.comment = comment;
        this.errors = errors;
    }

    public Model getDatatype() {
        return model;
    }

    public ValueComment getComment() {
        return comment;
    }

    @Override
    public ExcelErrorInfo[] getErrors() {
        return errors;
    }

    @Override
    public ExcelErrorInfo[] getWarnings() {
        return new ExcelErrorInfo[0];
    }

    @Override
    public UpdateEntryInfo[] getUpdates() {
        return new UpdateEntryInfo[0];
    }

    public ExcelErrorInfo[] getInfos() {
        return new ExcelErrorInfo[0];
    }
}

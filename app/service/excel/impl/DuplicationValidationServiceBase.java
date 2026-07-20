package service.excel.impl;

import excel.ExcelErrorInfo;
import org.apache.commons.lang3.mutable.MutableLong;
import play.i18n.Messages;
import service.excel.IExcelTableColumns;
import service.excel.IExcelTableValidationService;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;

public abstract class DuplicationValidationServiceBase implements IExcelTableValidationService {
    protected static final String Latitude = "latitude";
    protected static final String Longitude = "longitude";
    private final IRecordColumnMapper colMapper;
    private final Messages messages;

    public DuplicationValidationServiceBase(IRecordColumnMapper colMapper, Messages messages) {
        this.colMapper = colMapper;
        this.messages = messages;
    }

    protected abstract DuplicationStatus getDuplicationStatus(ParsedRecordDetails details, MutableLong duplicateId);

    @Override
    public void validateAll(Iterable<ParsedRecordDetails> wrappers) {
        for (ParsedRecordDetails rw : wrappers) {
            validate(rw);
        }
    }

    @Override
    public void validate(ParsedRecordDetails wrapper) {

        MutableLong duplicateRecordId = new MutableLong();
        DuplicationStatus duplicationStatus = getDuplicationStatus(wrapper, duplicateRecordId);
        if (duplicationStatus == DuplicationStatus.NoDuplicity) {
            return;
        }

        String errorMessage = createErrorMessage(duplicationStatus, duplicateRecordId);
        ExcelErrorInfo errorInfo = new ExcelErrorInfo(
            wrapper.getRowNumber(),
            colMapper.getColumn(IExcelTableColumns.TAXON_COLUMN_ID),
            errorMessage);

        reportDuplicateEntry(duplicationStatus, wrapper, errorInfo);
    }

    private String createErrorMessage(DuplicationStatus duplicationStatus, MutableLong duplicateRecordId) {
        String recordId = Long.toString(duplicateRecordId.getValue());
        switch (duplicationStatus) {
            case DuplicityError:
                return messages.at("ExcelTableValidationService.duplicateEntryAlreadyExists", recordId);
            case DuplicityWarning:
                return messages.at("ExcelTableValidationService.possibleDuplicateEntryAlreadyExists", recordId);
            default:
                return "";
        }
    }

    private void reportDuplicateEntry(DuplicationStatus duplicationStatus, ParsedRecordDetails wrapper, ExcelErrorInfo errorInfo) {
        switch (duplicationStatus) {
            case DuplicityWarning:
                wrapper.addWarning(errorInfo);
                break;
            case DuplicityError:
                wrapper.addError(errorInfo);
                break;
            case NoDuplicity:
                break;
        }
    }
}

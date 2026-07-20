package service.excel;


public interface IExcelTableValidationService {
    void validateAll(Iterable<ParsedRecordDetails> records);

    void validate(ParsedRecordDetails record);
}

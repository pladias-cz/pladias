package service.excel;

import service.excel.impl.RecordRowProvider;
import service.excel.impl.RowIterator;

import java.io.IOException;

public interface IDocumentLoadService {
    int DataSheetId = 0;

    Iterable<ParsedRecordDetails> loadRecords(RecordRowProvider rowProvider) throws IOException;

    RowIterator getIterator(RecordRowProvider rowProvider) throws IOException;
}

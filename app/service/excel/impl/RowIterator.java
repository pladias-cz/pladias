package service.excel.impl;

import service.excel.ParsedRecordDetails;
import service.excel.impl.recordRow.RecordRow;
import service.excel.impl.wrapper.RecordDetailsBuilderBase;

import java.util.Enumeration;
import java.util.NoSuchElementException;

public class RowIterator implements Enumeration<ParsedRecordDetails> {

    private final RecordRowProvider rowProvider;
    private final RecordDetailsBuilderBase recordsDetailsBuilder;

    public RowIterator(RecordRowProvider rowProvider, RecordDetailsBuilderBase recordsDetailsBuilder) {
        this.rowProvider = rowProvider;
        this.recordsDetailsBuilder = recordsDetailsBuilder;
    }

    @Override
    public boolean hasMoreElements() {
        return rowProvider.hasMoreElements();
    }

    @Override
    public ParsedRecordDetails nextElement() {
        if (!rowProvider.hasMoreElements()) {
            throw new NoSuchElementException();
        }

        RecordRow recordRow = rowProvider.nextElement();
        ParsedRecordDetails record = recordsDetailsBuilder.build(recordRow);
        return record;
    }

}

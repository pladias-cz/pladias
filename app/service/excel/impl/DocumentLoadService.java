package service.excel.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.excel.IDocumentLoadService;
import service.excel.ParsedRecordDetails;
import service.excel.impl.wrapper.RecordDetailsBuilderBase;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class DocumentLoadService implements IDocumentLoadService {
    private final Logger logger = LoggerFactory.getLogger(DocumentLoadService.class);

    private final RecordDetailsBuilderBase recordsDetailsBuilder;

    public DocumentLoadService(RecordDetailsBuilderBase recordsDetailsBuilder) {
        this.recordsDetailsBuilder = recordsDetailsBuilder;
    }

    @Override
    public RowIterator getIterator(RecordRowProvider rowProvider) throws IOException {
        return new RowIterator(rowProvider, recordsDetailsBuilder);
    }

    @Override
    public Iterable<ParsedRecordDetails> loadRecords(RecordRowProvider rowProvider) throws IOException {
        logger.info("Reading records");
        Iterable<ParsedRecordDetails> items = doLoadRecords(rowProvider);
        logger.info("Records loaded");
        return items;
    }

    private Iterable<ParsedRecordDetails> doLoadRecords(RecordRowProvider rowProvider) throws IOException {
        RowIterator iter = new RowIterator(rowProvider, recordsDetailsBuilder);

        List<ParsedRecordDetails> items = new ArrayList<ParsedRecordDetails>();

        while (iter.hasMoreElements()) {
            items.add(iter.nextElement());
        }

        return items;
    }
}

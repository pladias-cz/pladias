package service.excel.impl;

import service.excel.IDocument;
import service.excel.IRecordRowParser;
import service.excel.IRow;
import service.excel.impl.recordRow.RecordRow;

import java.util.Enumeration;

public class RecordRowProvider implements Enumeration<RecordRow> {
    private final IDocument doc;
    private final IRecordRowParser rowParser;

    public RecordRowProvider(IDocument doc, IRecordRowParser rowParser) {
        this.doc = doc;
        this.rowParser = rowParser;
    }

    @Override
    public boolean hasMoreElements() {
        return doc.hasMoreElements();
    }

    @Override
    public RecordRow nextElement() {
        IRow row = doc.nextElement();
        assert row != null;
        RecordRow recordRow = rowParser.build(row);
        return recordRow;
    }
}

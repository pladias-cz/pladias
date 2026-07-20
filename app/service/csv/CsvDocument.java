package service.csv;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import service.excel.IDocument;
import service.excel.IRow;

import java.io.IOException;
import java.io.Reader;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;

public class CsvDocument implements IDocument, AutoCloseable {

    private static final CSVFormat format = CSVFormat.EXCEL.withDelimiter(';').withHeader();
    private final Logger logger = LoggerFactory.getLogger(CsvDocument.class);
    private final CSVParser parser;
    private final Iterator<CSVRecord> iterator;
    private CSVRecord cachedEntry;

    public CsvDocument(Reader reader) throws IOException {
        parser = new CSVParser(reader, format);
        iterator = parser.iterator();
    }

    @Override
    public boolean hasMoreElements() {
        if (parser.isClosed()) {
            return false;
        }

        if (!loadEntryIfNeeded()) {
            return false;
        }

        return !isEmpty(cachedEntry);
    }

    private boolean loadEntryIfNeeded() {
        if (cachedEntry == null) {
            if (!iterator.hasNext()) {
                return false;
            }
            cachedEntry = iterator.next();
        }
        return true;
    }


    @Override
    public IRow nextElement() {

        if (!loadEntryIfNeeded()) {
            throw new NoSuchElementException();
        }

        if (!isEmpty(cachedEntry)) {
            CSVRow result = new CSVRow(cachedEntry);
            cachedEntry = null;
            return result;
        }
        throw new NoSuchElementException();
    }

    @Override
    public void close() {
        if (parser.isClosed()) {
            return;
        }

        try {
            parser.close();
        } catch (IOException e) {
            logger.error("Failed to close parser");
        }
    }

    @Override
    public List<String> getHeaders() {
        return parser.getHeaderNames();
    }

    private boolean isEmpty(CSVRecord record) {

        Iterator<String> columnIterator = record.iterator();
        while (columnIterator.hasNext()) {
            String value = columnIterator.next();
            if (StringUtils.isNotEmpty(value)) {
                return false;
            }
        }
        return true;
    }
}

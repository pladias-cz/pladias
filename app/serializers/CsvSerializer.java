package serializers;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

public class CsvSerializer implements AutoCloseable, IPrinter {
    private final OutputStream os;
    private final OutputStreamWriter out;
    private final CSVPrinter printer;

    public CsvSerializer(OutputStream targetStream) throws IOException {
        os = targetStream;
        printBom(os);
        Charset CHARSET = StandardCharsets.UTF_8;
        out = new OutputStreamWriter(os, CHARSET);

        CSVFormat format = CSVFormat.EXCEL.withDelimiter(';').withIgnoreEmptyLines(true);
        printer = new CSVPrinter(out, format);
    }

    private void printBom(OutputStream os) throws IOException {
        os.write('\ufeef'); // emits 0xef
        os.write('\ufebb'); // emits 0xbb
        os.write('\ufebf'); // emits 0xbf
    }

    @Override
    public void printLine(Iterable<String> values) throws IOException {
        printer.printRecord(values);
    }

    @Override
    public void close() throws IOException {
        printer.close();
        out.close();
        os.close();
    }
}

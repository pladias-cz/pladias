package taxon.renderer;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.io.output.ByteArrayOutputStream;
import org.apache.commons.lang3.tuple.Pair;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;
import java.util.List;

public class CsvTaxonOccurrenceRenderer implements ITaxonOccurrenceRenderer {

    @Override
    public byte[] render(int squareId, List<Pair<String, String>> taxonOccurrences) throws IOException {

        CSVFormat format = CSVFormat.EXCEL.withDelimiter(';');
        ByteArrayOutputStream bas = new ByteArrayOutputStream();
        OutputStreamWriter os = new OutputStreamWriter(bas, Charset.forName(Codepage));
        CSVPrinter printer = new CSVPrinter(os, format);

        for (Pair<String, String> pair : taxonOccurrences) {
            printer.printRecord(squareId, pair.getLeft(), pair.getRight());
        }
        printer.close();
        os.close();
        bas.close();
        return bas.toByteArray();
    }

    @Override
    public void setImage(byte[] pngImageStream) {
    }

    @Override
    public boolean canRenderImage() {
        return false;
    }
}

package service.taxon;

import models.Taxon;
import serializers.CsvSerializer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

public class TaxonSerializationService {

    public static byte[] serialize(List<Taxon> taxons) throws IOException {
        TaxonCsvGenerator generator = new TaxonCsvGenerator();

        try (ByteArrayOutputStream bas = new ByteArrayOutputStream()) {
            try (CsvSerializer serializer = new CsvSerializer(bas)) {
                List<String> headers = generator.getTaxonHeaders();
                serializer.printLine(headers);
                for (Taxon t : taxons) {
                    List<String> fields = generator.prepareTaxonFields(t);
                    serializer.printLine(fields);
                }
            }
            return bas.toByteArray();
        }
    }
}

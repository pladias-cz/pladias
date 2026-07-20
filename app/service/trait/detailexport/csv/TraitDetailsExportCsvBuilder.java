package service.trait.detailexport.csv;

import serializers.CsvSerializer;
import service.trait.detailexport.CellDetail;
import service.trait.detailexport.IDetailedExportBuilder;
import service.trait.detailexport.IExportDataTransformer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class TraitDetailsExportCsvBuilder implements IDetailedExportBuilder {
    ByteArrayOutputStream bas;
    CsvSerializer serializer;

    public TraitDetailsExportCsvBuilder() throws IOException {
        bas = new ByteArrayOutputStream();
        serializer = new CsvSerializer(bas);
    }

    @Override
    public String getExtension() {
        return "csv";
    }

    @Override
    public byte[] build(IExportDataTransformer exportDataProvider) throws IOException {

        serializeData(exportDataProvider.collectData());
        closeStream();
        return convertToBytes();
    }

    private void closeStream() throws IOException {
        serializer.close();
        bas.close();
    }

    private byte[] convertToBytes() {
        return bas.toByteArray();
    }

    private void serializeData(List<List<CellDetail>> data) throws IOException {
        for (List<CellDetail> row : data) {
            serialize(row);
        }
    }

    private void serialize(List<CellDetail> row) throws IOException {
        List<String> values = new ArrayList<String>();
        for (CellDetail cell : row) {
            values.add(cell.getText());
            for (int i = 1; i < cell.getColumnSpan(); i++) {
                //compensation for non-existence of column span
                values.add("");
            }
        }
        serializer.printLine(values);
    }

}

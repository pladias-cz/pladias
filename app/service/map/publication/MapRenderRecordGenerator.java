package service.map.publication;

import io.ebean.SqlRow;
import serializers.CsvSerializer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class MapRenderRecordGenerator {

    public static final String RecordIdColumn = "record_id";
    public static final String QuadrantIdColumn = "quadrant_name";
    public static final String SymbolForMapColumn = "symbol_for_map";
    public static final String MapTypeColumn = "map_type";
    public static final String RevisorsPrintMapCommentColumn = "revisors_print_map_comment";
    public static final String SymbolPriorityColumn = "symbol_priority";
    public static final String TaxonIdColumn = "taxon_id";
    public static final String TaxonNameColumn = "taxon_name";

    public byte[] convertToCsvData(List<SqlRow> data) throws IOException {
        try (ByteArrayOutputStream bas = new ByteArrayOutputStream()) {
            try (CsvSerializer mapRenderDetails = new CsvSerializer(bas)) {
                mapRenderDetails.printLine(getRecordHeaders());
                for (SqlRow row : data) {
                    List<String> values = getRecordFields(row);
                    mapRenderDetails.printLine(values);
                }
            }
            return bas.toByteArray();
        }
    }

    private List<String> getRecordHeaders() {
        List<String> list = new ArrayList<String>();
        list.add(RecordIdColumn);
        list.add(QuadrantIdColumn);
        list.add(SymbolForMapColumn);
        list.add(MapTypeColumn);
        list.add(RevisorsPrintMapCommentColumn);
        list.add(SymbolPriorityColumn);
        list.add(TaxonIdColumn);
        list.add(TaxonNameColumn);
        return list;
    }

    private List<String> getRecordFields(SqlRow row) {
        List<String> list = new ArrayList<String>();
        list.add(row.getString(RecordIdColumn));
        list.add(row.getString(QuadrantIdColumn));
        list.add(row.getString(SymbolForMapColumn));
        list.add(row.getString(MapTypeColumn));
        list.add(row.getString(RevisorsPrintMapCommentColumn));
        list.add(row.getString(SymbolPriorityColumn));
        list.add(row.getString(TaxonIdColumn));
        list.add(row.getString(TaxonNameColumn));
        return list;
    }

}

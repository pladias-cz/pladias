package service.taxon;

import io.ebean.*;
import io.ebean.DB;
import org.apache.commons.lang3.tuple.Pair;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import utils.MapSquareUtils;

import java.io.IOException;
import java.util.*;

public class TaxonOccurrenceService {

    public TaxonOccurrenceService() {
    }

    public List<Pair<String, String>> findRecordedTaxons(int squareId) throws IOException {
        String leftPaddedSquareId = MapSquareUtils.squareIdToString(squareId);

        String sql = "SELECT DISTINCT Q.letter AS quadrant, T.name_lat AS nameLat " +
            " FROM geodata.quadrants_full as Q, " +
            "      geodata.squares_full as S," +
            "      atlas.records as R " +
            "      INNER JOIN public.taxons AS T ON R.taxon_id = T.id " +
            " WHERE S.code = '" + leftPaddedSquareId + "' AND " +
            "      (R.validation_status = 3 OR R.validation_status = 0) AND " +
            "      S.id = Q.square_id AND " +
            "      ST_WITHIN(R.coords_wgs, Q.geom_wgs) " +
            " ORDER BY T.name_lat ASC ";
        List<SqlRow> rows = DB.sqlQuery(sql).findList();
        return createConsolidatedTaxonMap(rows);
    }

    private List<Pair<String, String>> createConsolidatedTaxonMap(List<SqlRow> rows) {
        List<Pair<String, String>> result = new ArrayList<>();
        Map<String, Set<String>> consolidated = createConsolidatedTaxonOccurrences(rows);
        for (String key : consolidated.keySet()) {
            String quadrants = concatenateQuadrants(consolidated.get(key));
            result.add(Pair.of(key, quadrants));
        }
        return result;
    }

    private TreeMap<String, Set<String>> createConsolidatedTaxonOccurrences(List<SqlRow> rows) {
        TreeMap<String, Set<String>> consolidatedTaxonOccurrence = new TreeMap<>();
        for (SqlRow r : rows) {
            String quadrant = r.getString("quadrant");
            String nameLat = r.getString("nameLat");
            Set<String> quadrants = null;
            if (!consolidatedTaxonOccurrence.containsKey(nameLat)) {
                quadrants = new TreeSet<>();
                consolidatedTaxonOccurrence.put(nameLat, quadrants);
            } else {
                quadrants = consolidatedTaxonOccurrence.get(nameLat);
            }
            quadrants.add(quadrant);
        }
        return consolidatedTaxonOccurrence;
    }

    private String concatenateQuadrants(Set<String> quadrants) {
        StringBuilder builder = new StringBuilder();
        for (String q : quadrants) {
            builder.append(q);
        }
        return builder.toString();
    }

    public String generateFilenameFor(int squareId) {
        DateTime dt = new DateTime();
        DateTimeFormatter fmt = DateTimeFormat.forPattern("yyyy-MM-dd");
        String dateString = fmt.print(dt);
        return String.format("Pladias_sq%d_%s.csv", squareId, dateString);
    }
}

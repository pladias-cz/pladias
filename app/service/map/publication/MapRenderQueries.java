package service.map.publication;

import models.MapType;
import models.Taxon;
import models.TaxonMapSettings;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class MapRenderQueries {
    private static final String TaxonIdsParam = "@taxonIds";
    private static final String MainTaxonIdParam = "@taxonId";
    private static final String MainTaxonName = "@taxonName";
    private static final String MainTaxonRevisorsComment = "@revisorsComment";
    private static final String CommonThresholdParam = "@commonThreshold";
    private static final String MapTypeParam = "@mapType";
    private static final String HerbVsNonHerbMapQuery =
        """
                       SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM  \r
                       -----------------------------------------------------------\r
                         \
                               (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'herb' AS symbol_for_map,  \r
                                     @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '3' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r
                         \r
                               FROM atlas.records as recs, \r
                                    geodata.quadrants_full as quads,  \r
                                    atlas.taxon_mapsettings AS settings, \r
                                    public.taxons AS taxons \r
                         \r
                               WHERE recs.taxon_id IN (@taxonIds) AND \r
                                     recs.herbarium_quality = true AND \r
                                     recs.validation_status=3 AND \r
                                     recs.include_in_map = true AND  \r
                                     settings.taxon_id= recs.taxon_id AND \r
                                     taxons.id = recs.taxon_id AND \r
                                     ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r
                        \r
                               UNION ------------------------------------- \r
                        \r
                        \r
                               SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'neherb' AS symbol,  \r
                                     @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '2' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r
                        \r
                               FROM atlas.records as recs, \r
                                    geodata.quadrants_full as quads,  \r
                                    atlas.taxon_mapsettings AS settings, \r
                                    public.taxons AS taxons \r
                        \r
                               WHERE recs.taxon_id IN (@taxonIds) AND \r
                                     recs.herbarium_quality = false AND \r
                                     recs.validation_status=3 AND \r
                                     recs.include_in_map = true AND  \r
                                     settings.taxon_id= recs.taxon_id AND \r
                                     taxons.id = recs.taxon_id AND \r
                                     ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r
                        \r
                               UNION ----------------------------------- \r
                        \r
                               SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nejisty' AS symbol,  \r
                                     @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '0' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r
                        \r
                               FROM atlas.records as recs, \r
                                    geodata.quadrants_full as quads,  \r
                                    atlas.taxon_mapsettings AS settings, \r
                                    public.taxons AS taxons \r
                        \r
                               WHERE \r
                                     recs.taxon_id IN (@taxonIds) AND \r
                                     recs.include_in_map = true AND  \r
                                     settings.taxon_id= recs.taxon_id AND \r
                                     recs.validation_status=1 AND  \r
                                     taxons.id = recs.taxon_id AND \r
                                     ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r
                        \r
                        UNION --------------- common has greater priority than uncertain ---------------- \r
                        \r
                               SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'common' AS symbol,  \r
                                     @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r
                               FROM \r
                                  atlas.records as recs  \r
                                  INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id = recs.taxon_id  \r
                                  INNER JOIN public.taxons AS taxons ON recs.taxon_id = taxons.id, \r
                                  geodata.quadrants_full as quads                 \r
                                  INNER JOIN \r
                                         (SELECT count(*) AS count, qqq.id as quadrantId \r
                                          FROM atlas.records AS rrr, geodata.quadrants_full as qqq \r
                                          WHERE rrr.taxon_id IN (@taxonIds) AND \r
                                                rrr.validation_status=0 AND \r
                                                ST_WITHIN(rrr.coords_wgs, qqq.geom_wgs) \r
                                          GROUP BY qqq.id) AS notInvalidatedRecordsPerQuadrant \r
                                  ON notInvalidatedRecordsPerQuadrant.quadrantId =  quads.id \r
                               WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND \r
                                   recs.taxon_id IN (@taxonIds) AND  \r
                                   @commonThreshold <= notInvalidatedRecordsPerQuadrant.count AND \r
                                   @commonThreshold > 0 AND  \r
                                   recs.validation_status=0 \r
                        \r
                               ORDER BY quadrant_name ASC, symbol_priority DESC \r
                               ) AS symbols \r
                        \r
                       -----------------------------------------------------------         \r
                         \
                       ORDER BY quadrant_name ASC, symbol_priority DESC \r
            """;
    private static final String LostVsRecentMapQuery =
        """
            SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM \r
            \r
            -----------------------------------------------------------\r
            \r
                    (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'recent' AS symbol_for_map, \r
                          @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '3' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
            \r
                    FROM atlas.records as recs,\r
                         geodata.quadrants_full as quads, \r
                         atlas.taxon_mapsettings AS settings,\r
                         public.taxons AS taxons\r
            \r
                         \r
                    WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND \r
                          recs.taxon_id IN (@taxonIds) AND\r
                          recs.validation_status=3 AND\r
                          recs.include_in_map = true AND \r
                          datum >='2000-01-01' AND\r
                          settings.taxon_id= recs.taxon_id AND\r
                          taxons.id = recs.taxon_id\r
            \r
            \r
                    UNION -------------------------------------\r
            \r
            \r
                    SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'zanik' AS symbol, \r
                          @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '2' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
            \r
                    FROM atlas.records as recs,\r
                         geodata.quadrants_full as quads, \r
                         atlas.taxon_mapsettings AS settings,\r
                         public.taxons AS taxons\r
            \r
                    WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND\r
                          recs.taxon_id IN (@taxonIds) AND\r
                          recs.validation_status=3 AND\r
                          recs.include_in_map = true AND \r
                          (datum <'2000-01-01' or datum is null) AND\r
                          settings.taxon_id= recs.taxon_id AND\r
                          taxons.id = recs.taxon_id\r
            \r
                    UNION -----------------------------------\r
            \r
                    SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nejisty' AS symbol, \r
                          @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '0' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
            \r
                    FROM atlas.records as recs,\r
                         geodata.quadrants_full as quads, \r
                         atlas.taxon_mapsettings AS settings,\r
                         public.taxons AS taxons\r
            \r
                         \r
                    WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND\r
                          recs.taxon_id IN (@taxonIds) AND\r
                          recs.include_in_map = true AND \r
                          settings.taxon_id=recs.taxon_id AND\r
                          recs.validation_status=1 AND\r
                          taxons.id = recs.taxon_id\r
            \r
             UNION ----------- common has greater priority than uncertain -------------\r
            \r
                    SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'common' AS symbol, \r
                          @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
            \r
                    FROM atlas.records as recs \r
                         INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id = recs.taxon_id \r
                         INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id, \r
                         geodata.quadrants_full as quads INNER JOIN \r
                              (SELECT count(*) AS count, qqq.id as quadrantId \r
                               FROM atlas.records AS rrr, geodata.quadrants_full AS qqq \r
                               WHERE rrr.taxon_id IN (@taxonIds) AND \r
                                     ST_WITHIN(rrr.coords_wgs, qqq.geom_wgs) AND \r
                                     rrr.validation_status=0 \r
                               GROUP BY qqq.id) AS notInvalidatedRecordsPerQuadrant \r
                     ON notInvalidatedRecordsPerQuadrant.quadrantId =  quads.id \r
            \r
                    WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND \
                          recs.taxon_id IN (@taxonIds) AND \r
                          @commonThreshold <= notInvalidatedRecordsPerQuadrant.count AND \r
                          @commonThreshold > 0 AND \
                          recs.validation_status=0 \r
            \r
                    ORDER BY quadrant_name ASC, symbol_priority DESC\r
                    ) AS symbols\r
            \r
            -----------------------------------------------------------         \r
             \r
            ORDER BY quadrant_name ASC, symbol_priority DESC;\r
            """;
    private static final String DefaultMapQuery =
        """
            SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM \r
            \r
            ------------------- green --------------------------------\r
            \r
                    (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'green' AS symbol_for_map, \r
                          @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, recs.validation_status AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
            \r
                       FROM geodata.quadrants_full as quads,  \r
                            atlas.records as recs \r
                            INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r
                            INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r
            \r
                         \r
                    WHERE recs.taxon_id IN (@taxonIds) AND \r
                         recs.validation_status = 3 AND \r
                         recs.include_in_map = true  AND \r
                         ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \
            \r
             UNION ------------ uncertain --------------\r
            \r
                    SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'nejisty' AS symbol_for_map, \r
                          @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, 0 AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
            \r
                       FROM geodata.quadrants_full as quads,  \r
                            atlas.records as recs \r
                            INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r
                            INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r
            \r
                         \r
                    WHERE recs.taxon_id IN (@taxonIds) AND \r
                         recs.validation_status  = 1 AND \r
                         recs.include_in_map = true  AND \r
                         ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r
            \r
             UNION ------------- common has greater priority than uncertain ----------------\r
            \r
                    SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'common' AS symbol, \r
                          @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, \
                          '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
            \r
                       FROM atlas.records as recs \r
                            INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r
                            INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id, \r
                            geodata.quadrants_full as quads \r
                            INNER JOIN \r
                              (SELECT count(*) AS count, qqq.id as quadrantId \r
                               FROM atlas.records AS rrr, geodata.quadrants_full AS qqq \r
                               WHERE rrr.taxon_id IN (@taxonIds) AND \r
                                     rrr.validation_status=0 AND \r
                                     ST_WITHIN(rrr.coords_wgs, qqq.geom_wgs) \r
                               GROUP BY qqq.id) AS notInvalidatedRecordsPerQuadrant \r
                           ON notInvalidatedRecordsPerQuadrant.quadrantId =  quads.id \r
            \r
                      WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND \r
                          recs.taxon_id IN (@taxonIds) AND\r
                          @commonThreshold <= notInvalidatedRecordsPerQuadrant.count AND \
                          @commonThreshold > 0 AND \
                          recs.validation_status=0 \r
               \r
                    ORDER BY quadrant_name ASC, symbol_priority DESC\r
                    ) AS symbols\r
            \r
            -----------------------------------------------------------         \r
             \r
            ORDER BY quadrant_name ASC, symbol_priority DESC;""";
    private static final String NativeVersusAlientMapQuery = """
        \r
        \r
        SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM \r
        \r
        -----------------------------------------------------------\r
        \r
                (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'puvodni' AS symbol_for_map, \r
                      @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '3' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
        \r
                FROM geodata.quadrants_full as quads,  \r
                    atlas.records as recs \r
                    INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r
                    INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r
        \r
                WHERE recs.taxon_id IN (@taxonIds) AND\r
                      recs.validation_status=3 AND\r
                      recs.originality_id=1 AND\r
                      recs.include_in_map = true AND \r
                      ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r
        \r
                UNION -------------------------------------\r
        \r
        \r
                SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nepuvodni' AS symbol, \r
                      @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '2' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
        \r
                FROM geodata.quadrants_full as quads,  \r
                    atlas.records as recs \r
                    INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r
                    INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r
        \r
                     \r
                WHERE recs.taxon_id IN (@taxonIds) AND\r
                      recs.include_in_map = true AND \r
                      recs.validation_status=3 AND\r
                      recs.originality_id=3 AND\r
                      ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \
          UNION -----------------------------------\r
        \r
                SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'neurceny' AS symbol, \r
                      @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
        \r
                FROM geodata.quadrants_full as quads,  \r
                    atlas.records as recs \r
                    INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r
                    INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r
        \r
                     \r
                WHERE recs.taxon_id IN (@taxonIds) AND           \r
                     recs.include_in_map = true AND \r
                     recs.originality_id=4 AND\r
                     recs.validation_status=3 AND\r
                     ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r
        \r
                UNION -----------------------------------\r
        \r
                SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nejisty' AS symbol, \r
                      @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '0' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r
        \r
                   FROM atlas.records as recs \r
                        INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r
                        INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id, \r
                        geodata.quadrants_full as quads \r
        \r
                     \r
                WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND\r
                      recs.taxon_id IN (@taxonIds) AND           \r
                      recs.include_in_map = true AND \r
                      recs.validation_status=1\r
        \r
          \r
           \r
                ORDER BY quadrant_name ASC, symbol_priority DESC\r
                ) AS symbols\r
        \r
        -----------------------------------------------------------         \r
         \r
        ORDER BY quadrant_name ASC, symbol_priority DESC;\r
        """;

    public static String getQuery(Taxon taxon, MapType mapType, int commonThreshold) {
        String query = switch (mapType) {
            case Default -> DefaultMapQuery;
            case HerbariumVersusNonHerbarium -> HerbVsNonHerbMapQuery;
            case LostVersusRecent -> LostVsRecentMapQuery;
            case NativeVersusAlien -> NativeVersusAlientMapQuery;
        };
        List<Long> impliedTaxons = getImpliedTaxons(taxon);
        String serializedCommaSeparatedTaxonIds = serialize(impliedTaxons);
        query = query.replace(TaxonIdsParam, serializedCommaSeparatedTaxonIds);
        query = query.replace(MainTaxonIdParam, Long.toString(taxon.getId()));
        query = query.replace(MainTaxonName, "'" + taxon.getNameLat() + "'");
        query = query.replace(CommonThresholdParam, Integer.toString(commonThreshold));
        query = query.replace(MapTypeParam, Integer.toString(mapType.getId()));
        String trimmedComment = StringUtils.trimToEmpty(taxon.getTaxonMapSettings().getRevisorsComment());
        return query.replace(MainTaxonRevisorsComment, "'" + trimmedComment + "'");
    }

    private static List<Long> getImpliedTaxons(Taxon taxon) {
        List<Long> result = new ArrayList<>();
        result.add(taxon.getId());
        List<TaxonMapSettings> directChildren = taxon.getTaxonMapSettings().getAggregatedChildren();
        for (TaxonMapSettings s : directChildren) {
            result.add(s.getId());
        }
        return result;
    }

    private static String serialize(Iterable<Long> taxonIds) {
        StringBuilder builder = new StringBuilder();
        for (long t : taxonIds) {
            builder.append(t).append(',');
        }
        builder.append(-1); // impossible value to simplify the comma-separated list generation
        return builder.toString();
    }

}

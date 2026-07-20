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
        "           SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM  \r\n" +
            "           -----------------------------------------------------------\r\n" +
            "             " +
            "                   (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'herb' AS symbol_for_map,  \r\n" +
            "                         @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '3' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r\n" +
            "             \r\n" +
            "                   FROM atlas.records as recs, \r\n" +
            "                        geodata.quadrants_full as quads,  \r\n" +
            "                        atlas.taxon_mapsettings AS settings, \r\n" +
            "                        public.taxons AS taxons \r\n" +

            "             \r\n" +
            "                   WHERE recs.taxon_id IN (@taxonIds) AND \r\n" +
            "                         recs.herbarium_quality = true AND \r\n" +
            "                         recs.validation_status=3 AND \r\n" +
            "                         recs.include_in_map = true AND  \r\n" +
            "                         settings.taxon_id= recs.taxon_id AND \r\n" +
            "                         taxons.id = recs.taxon_id AND \r\n" +
            "                         ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r\n" +
            "            \r\n" +
            "                   UNION ------------------------------------- \r\n" +
            "            \r\n" +
            "            \r\n" +
            "                   SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'neherb' AS symbol,  \r\n" +
            "                         @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '2' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r\n" +
            "            \r\n" +
            "                   FROM atlas.records as recs, \r\n" +
            "                        geodata.quadrants_full as quads,  \r\n" +
            "                        atlas.taxon_mapsettings AS settings, \r\n" +
            "                        public.taxons AS taxons \r\n" +
            "            \r\n" +
            "                   WHERE recs.taxon_id IN (@taxonIds) AND \r\n" +
            "                         recs.herbarium_quality = false AND \r\n" +
            "                         recs.validation_status=3 AND \r\n" +
            "                         recs.include_in_map = true AND  \r\n" +
            "                         settings.taxon_id= recs.taxon_id AND \r\n" +
            "                         taxons.id = recs.taxon_id AND \r\n" +
            "                         ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r\n" +
            "            \r\n" +
            "                   UNION ----------------------------------- \r\n" +
            "            \r\n" +
            "                   SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nejisty' AS symbol,  \r\n" +
            "                         @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '0' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r\n" +
            "            \r\n" +
            "                   FROM atlas.records as recs, \r\n" +
            "                        geodata.quadrants_full as quads,  \r\n" +
            "                        atlas.taxon_mapsettings AS settings, \r\n" +
            "                        public.taxons AS taxons \r\n" +
            "            \r\n" +
            "                   WHERE \r\n" +
            "                         recs.taxon_id IN (@taxonIds) AND \r\n" +
            "                         recs.include_in_map = true AND  \r\n" +
            "                         settings.taxon_id= recs.taxon_id AND \r\n" +
            "                         recs.validation_status=1 AND  \r\n" +
            "                         taxons.id = recs.taxon_id AND \r\n" +
            "                         ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r\n" +
            "            \r\n" +
            "            UNION --------------- common has greater priority than uncertain ---------------- \r\n" +
            "            \r\n" +
            "                   SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'common' AS symbol,  \r\n" +
            "                         @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name \r\n" +

            "                   FROM \r\n" +
            "                      atlas.records as recs  \r\n" +
            "                      INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id = recs.taxon_id  \r\n" +
            "                      INNER JOIN public.taxons AS taxons ON recs.taxon_id = taxons.id, \r\n" +
            "                      geodata.quadrants_full as quads                 \r\n" +
            "                      INNER JOIN \r\n" +
            "                             (SELECT count(*) AS count, qqq.id as quadrantId \r\n" +
            "                              FROM atlas.records AS rrr, geodata.quadrants_full as qqq \r\n" +
            "                              WHERE rrr.taxon_id IN (@taxonIds) AND \r\n" +
            "                                    rrr.validation_status=0 AND \r\n" +
            "                                    ST_WITHIN(rrr.coords_wgs, qqq.geom_wgs) \r\n" +
            "                              GROUP BY qqq.id) AS notInvalidatedRecordsPerQuadrant \r\n" +
            "                      ON notInvalidatedRecordsPerQuadrant.quadrantId =  quads.id \r\n" +

            "                   WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND \r\n" +
            "                       recs.taxon_id IN (@taxonIds) AND  \r\n" +
            "                       @commonThreshold <= notInvalidatedRecordsPerQuadrant.count AND \r\n" +
            "                       @commonThreshold > 0 AND  \r\n" +
            "                       recs.validation_status=0 \r\n" +
            "            \r\n" +
            "                   ORDER BY quadrant_name ASC, symbol_priority DESC \r\n" +
            "                   ) AS symbols \r\n" +
            "            \r\n" +
            "           -----------------------------------------------------------         \r\n" +
            "             " +
            "           ORDER BY quadrant_name ASC, symbol_priority DESC \r\n";
    private static final String LostVsRecentMapQuery =
        "SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM \r\n" +
            "\r\n" +
            "-----------------------------------------------------------\r\n" +
            "\r\n" +
            "        (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'recent' AS symbol_for_map, \r\n" +
            "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '3' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
            "\r\n" +
            "        FROM atlas.records as recs,\r\n" +
            "             geodata.quadrants_full as quads, \r\n" +
            "             atlas.taxon_mapsettings AS settings,\r\n" +
            "             public.taxons AS taxons\r\n" +
            "\r\n" +
            "             \r\n" +
            "        WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND \r\n" +
            "              recs.taxon_id IN (@taxonIds) AND\r\n" +
            "              recs.validation_status=3 AND\r\n" +
            "              recs.include_in_map = true AND \r\n" +
            "              datum >='2000-01-01' AND\r\n" +
            "              settings.taxon_id= recs.taxon_id AND\r\n" +
            "              taxons.id = recs.taxon_id\r\n" +
            "\r\n" +
            "\r\n" +
            "        UNION -------------------------------------\r\n" +
            "\r\n" +
            "\r\n" +
            "        SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'zanik' AS symbol, \r\n" +
            "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '2' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
            "\r\n" +
            "        FROM atlas.records as recs,\r\n" +
            "             geodata.quadrants_full as quads, \r\n" +
            "             atlas.taxon_mapsettings AS settings,\r\n" +
            "             public.taxons AS taxons\r\n" +
            "\r\n" +
            "        WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND\r\n" +
            "              recs.taxon_id IN (@taxonIds) AND\r\n" +
            "              recs.validation_status=3 AND\r\n" +
            "              recs.include_in_map = true AND \r\n" +
            "              (datum <'2000-01-01' or datum is null) AND\r\n" +
            "              settings.taxon_id= recs.taxon_id AND\r\n" +
            "              taxons.id = recs.taxon_id\r\n" +
            "\r\n" +
            "        UNION -----------------------------------\r\n" +
            "\r\n" +
            "        SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nejisty' AS symbol, \r\n" +
            "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '0' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
            "\r\n" +
            "        FROM atlas.records as recs,\r\n" +
            "             geodata.quadrants_full as quads, \r\n" +
            "             atlas.taxon_mapsettings AS settings,\r\n" +
            "             public.taxons AS taxons\r\n" +
            "\r\n" +
            "             \r\n" +
            "        WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND\r\n" +
            "              recs.taxon_id IN (@taxonIds) AND\r\n" +
            "              recs.include_in_map = true AND \r\n" +
            "              settings.taxon_id=recs.taxon_id AND\r\n" +
            "              recs.validation_status=1 AND\r\n" +
            "              taxons.id = recs.taxon_id\r\n" +
            "\r\n" +
            " UNION ----------- common has greater priority than uncertain -------------\r\n" +
            "\r\n" +
            "        SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'common' AS symbol, \r\n" +
            "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
            "\r\n" +
            "        FROM atlas.records as recs \r\n" +
            "             INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id = recs.taxon_id \r\n" +
            "             INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id, \r\n" +
            "             geodata.quadrants_full as quads INNER JOIN \r\n" +
            "                  (SELECT count(*) AS count, qqq.id as quadrantId \r\n" +
            "                   FROM atlas.records AS rrr, geodata.quadrants_full AS qqq \r\n" +
            "                   WHERE rrr.taxon_id IN (@taxonIds) AND \r\n" +
            "                         ST_WITHIN(rrr.coords_wgs, qqq.geom_wgs) AND \r\n" +
            "                         rrr.validation_status=0 \r\n" +
            "                   GROUP BY qqq.id) AS notInvalidatedRecordsPerQuadrant \r\n" +
            "         ON notInvalidatedRecordsPerQuadrant.quadrantId =  quads.id \r\n" +
            "\r\n" +
            "        WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND " +
            "              recs.taxon_id IN (@taxonIds) AND \r\n" +
            "              @commonThreshold <= notInvalidatedRecordsPerQuadrant.count AND \r\n" +
            "              @commonThreshold > 0 AND " +
            "              recs.validation_status=0 \r\n" +
            "\r\n" +
            "        ORDER BY quadrant_name ASC, symbol_priority DESC\r\n" +
            "        ) AS symbols\r\n" +
            "\r\n" +
            "-----------------------------------------------------------         \r\n" +
            " \r\n" +
            "ORDER BY quadrant_name ASC, symbol_priority DESC;\r\n";
    private static final String DefaultMapQuery =
        "SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM \r\n" +
            "\r\n" +
            "------------------- green --------------------------------\r\n" +
            "\r\n" +
            "        (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'green' AS symbol_for_map, \r\n" +
            "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, recs.validation_status AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
            "\r\n" +

            "           FROM geodata.quadrants_full as quads,  \r\n" +
            "                atlas.records as recs \r\n" +
            "                INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r\n" +
            "                INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r\n" +
            "\r\n" +
            "             \r\n" +
            "        WHERE recs.taxon_id IN (@taxonIds) AND \r\n" +
            "             recs.validation_status = 3 AND \r\n" +
            "             recs.include_in_map = true  AND \r\n" +
            "             ST_WITHIN(recs.coords_wgs, quads.geom_wgs) " +
            "\r\n" +
            " UNION ------------ uncertain --------------\r\n" +
            "\r\n" +
            "        SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'nejisty' AS symbol_for_map, \r\n" +
            "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, 0 AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
            "\r\n" +
            "           FROM geodata.quadrants_full as quads,  \r\n" +
            "                atlas.records as recs \r\n" +
            "                INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r\n" +
            "                INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r\n" +
            "\r\n" +
            "             \r\n" +
            "        WHERE recs.taxon_id IN (@taxonIds) AND \r\n" +
            "             recs.validation_status  = 1 AND \r\n" +
            "             recs.include_in_map = true  AND \r\n" +
            "             ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r\n" +
            "\r\n" +
            " UNION ------------- common has greater priority than uncertain ----------------\r\n" +
            "\r\n" +
            "        SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'common' AS symbol, \r\n" +
            "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, " +
            "              '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
            "\r\n" +
            "           FROM atlas.records as recs \r\n" +
            "                INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r\n" +
            "                INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id, \r\n" +
            "                geodata.quadrants_full as quads \r\n" +
            "                INNER JOIN \r\n" +
            "                  (SELECT count(*) AS count, qqq.id as quadrantId \r\n" +
            "                   FROM atlas.records AS rrr, geodata.quadrants_full AS qqq \r\n" +
            "                   WHERE rrr.taxon_id IN (@taxonIds) AND \r\n" +
            "                         rrr.validation_status=0 AND \r\n" +
            "                         ST_WITHIN(rrr.coords_wgs, qqq.geom_wgs) \r\n" +
            "                   GROUP BY qqq.id) AS notInvalidatedRecordsPerQuadrant \r\n" +
            "               ON notInvalidatedRecordsPerQuadrant.quadrantId =  quads.id \r\n" +
            "\r\n" +
            "          WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND \r\n" +
            "              recs.taxon_id IN (@taxonIds) AND\r\n" +
            "              @commonThreshold <= notInvalidatedRecordsPerQuadrant.count AND " +
            "              @commonThreshold > 0 AND " +
            "              recs.validation_status=0 \r\n" +
            "   \r\n" +
            "        ORDER BY quadrant_name ASC, symbol_priority DESC\r\n" +
            "        ) AS symbols\r\n" +
            "\r\n" +
            "-----------------------------------------------------------         \r\n" +
            " \r\n" +
            "ORDER BY quadrant_name ASC, symbol_priority DESC;";
    private static final String NativeVersusAlientMapQuery = "\r\n" +
        "\r\n" +
        "SELECT DISTINCT ON (quadrant_name) record_id, quadrant_name, symbol_for_map, map_type, revisors_comment, revisors_print_map_comment, symbol_priority, taxon_id, taxon_name FROM \r\n" +
        "\r\n" +
        "-----------------------------------------------------------\r\n" +
        "\r\n" +
        "        (SELECT DISTINCT ON (quadrant_name) recs.id AS record_id, quads.code AS quadrant_name, 'puvodni' AS symbol_for_map, \r\n" +
        "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '3' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
        "\r\n" +
        "        FROM geodata.quadrants_full as quads,  \r\n" +
        "            atlas.records as recs \r\n" +
        "            INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r\n" +
        "            INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r\n" +
        "\r\n" +
        "        WHERE recs.taxon_id IN (@taxonIds) AND\r\n" +
        "              recs.validation_status=3 AND\r\n" +
        "              recs.originality_id=1 AND\r\n" +
        "              recs.include_in_map = true AND \r\n" +
        "              ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r\n" +
        "\r\n" +
        "        UNION -------------------------------------\r\n" +
        "\r\n" +
        "\r\n" +
        "        SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nepuvodni' AS symbol, \r\n" +
        "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '2' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
        "\r\n" +

        "        FROM geodata.quadrants_full as quads,  \r\n" +
        "            atlas.records as recs \r\n" +
        "            INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r\n" +
        "            INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r\n" +
        "\r\n" +
        "             \r\n" +
        "        WHERE recs.taxon_id IN (@taxonIds) AND\r\n" +
        "              recs.include_in_map = true AND \r\n" +
        "              recs.validation_status=3 AND\r\n" +
        "              recs.originality_id=3 AND\r\n" +
        "              ST_WITHIN(recs.coords_wgs, quads.geom_wgs) " +
        "  UNION -----------------------------------\r\n" +
        "\r\n" +
        "        SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'neurceny' AS symbol, \r\n" +
        "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '1' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
        "\r\n" +
        "        FROM geodata.quadrants_full as quads,  \r\n" +
        "            atlas.records as recs \r\n" +
        "            INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r\n" +
        "            INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id \r\n" +
        "\r\n" +
        "             \r\n" +
        "        WHERE recs.taxon_id IN (@taxonIds) AND           \r\n" +
        "             recs.include_in_map = true AND \r\n" +
        "             recs.originality_id=4 AND\r\n" +
        "             recs.validation_status=3 AND\r\n" +
        "             ST_WITHIN(recs.coords_wgs, quads.geom_wgs) \r\n" +
        "\r\n" +
        "        UNION -----------------------------------\r\n" +
        "\r\n" +
        "        SELECT DISTINCT ON (quadrant_name) recs.id, quads.code AS quadrant_name, 'nejisty' AS symbol, \r\n" +
        "              @mapType as map_type, @revisorsComment as revisors_comment, settings.revisors_print_map_comment as revisors_print_map_comment, '0' AS symbol_priority, @taxonId AS taxon_id, @taxonName AS taxon_name\r\n" +
        "\r\n" +
        "           FROM atlas.records as recs \r\n" +
        "                INNER JOIN public.taxons AS taxons ON taxons.id = recs.taxon_id \r\n" +
        "                INNER JOIN atlas.taxon_mapsettings AS settings ON settings.taxon_id= taxons.id, \r\n" +
        "                geodata.quadrants_full as quads \r\n" +
        "\r\n" +
        "             \r\n" +
        "        WHERE ST_WITHIN(recs.coords_wgs, quads.geom_wgs) AND\r\n" +
        "              recs.taxon_id IN (@taxonIds) AND           \r\n" +
        "              recs.include_in_map = true AND \r\n" +
        "              recs.validation_status=1\r\n" +
        "\r\n" +
        "  \r\n" +
        "   \r\n" +
        "        ORDER BY quadrant_name ASC, symbol_priority DESC\r\n" +
        "        ) AS symbols\r\n" +
        "\r\n" +
        "-----------------------------------------------------------         \r\n" +
        " \r\n" +
        "ORDER BY quadrant_name ASC, symbol_priority DESC;\r\n";

    public static String getQuery(Taxon taxon, MapType mapType, int commonThreshold) {
        String query = null;
        switch (mapType) {
            case Default:
                query = DefaultMapQuery;
                break;
            case HerbariumVersusNonHerbarium:
                query = HerbVsNonHerbMapQuery;
                break;
            case LostVersusRecent:
                query = LostVsRecentMapQuery;
                break;
            case NativeVersusAlien:
                query = NativeVersusAlientMapQuery;
        }
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
        List<Long> result = new ArrayList<Long>();
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

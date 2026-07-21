package utils;

import io.ebean.*;
import models.Project;
import models.QuadrantNew;
import models.Record;
import models.Taxon;

import java.util.Set;

public class RecordStatistics {

    public static int getRecordCountByStatus(long taxonId, int statusId) {
        return Record.find().query().where()
            .eq("taxon_id", taxonId)
            .eq("validation_status", statusId)
            .findCount();
    }


    public static int getRecordCountIncludedInMap(long taxonId) {
        return Record.find().query().where()
            .eq("taxon_id", taxonId)
            .eq("include_in_map", true)
            .findCount();
    }

    public static int getRecordCountByProject(Taxon taxon, Project project) {
        return Record.find().query().where()
            .eq("taxon.id", taxon.getId())
            .eq("project.id", project.getId())
            .findCount();
    }

    public static int getRecordCountWithComment(long taxonId) {
        String sql =
            "SELECT COUNT(DISTINCT recs.id) AS recsCount FROM atlas.records AS recs " +
                "INNER JOIN atlas.comments AS coms " +
                "ON recs.id = coms.record_id " +
                "WHERE recs.taxon_id = :taxonId";

        SqlRow row = DB.sqlQuery(sql.toString())
            .setParameter("taxonId", taxonId)
            .findOne();

        return row.getInteger("recsCount");
    }

    public static int getRecordBoundToSquares(long taxonId) {
        String sql =
            "SELECT COUNT(DISTINCT recs.id) AS recsCount FROM atlas.records AS recs " +
                "INNER JOIN atlas.records_squares AS recs_sqrs " +
                "ON recs.id = recs_sqrs.records_id " +
                "WHERE recs.taxon_id = :taxonId AND recs.longitude is NULL";

        SqlRow row = DB.sqlQuery(sql.toString())
            .setParameter("taxonId", taxonId)
            .findOne();

        return row.getInteger("recsCount");
    }

    public static int getRecordBoundToQuadrants(long taxonId) {

        String sql =
            "SELECT COUNT(DISTINCT recs.id) AS recsCount FROM atlas.records AS recs " +
                "INNER JOIN atlas.records_quadrants AS recs_quads " +
                "ON recs.id = recs_quads.records_id " +
                "WHERE recs.taxon_id = :taxonId AND recs.longitude is NULL";

        SqlRow row = DB.sqlQuery(sql.toString())
            .setParameter("taxonId", taxonId)
            .findOne();

        return row.getInteger("recsCount");
    }

    public static int getRecordsBoundToCoords(long taxonId) {
        String sql =
            "SELECT COUNT(DISTINCT id) as recsCount FROM atlas.records " +
                "WHERE taxon_id = :taxonId AND latitude IS NOT NULL";

        SqlRow row = DB.sqlQuery(sql.toString())
            .setParameter("taxonId", taxonId)
            .findOne();

        return row.getInteger("recsCount");
    }

    /**
     * Returns set of Quadrants that contain at least one record with specified statusId
     *
     */
    // TODO
    // WITH sub AS (
    // SELECT quads.id, max(s.priority) as max
    // FROM atlas.records
    // join atlas.record_validation_status s ON (s.id = recs.validation_status)
    // WHERE r.taxon_id = XXX
    //  group by quads.id)
    //  SELECT count(*) FROM sub WHERE max = YYY -- a zde použít nikoli id, ale prioritu daného statusu...
    public static Set<QuadrantNew> getQuadrantsByTaxonStatus(long taxonId, int statusId) {
        String sql =
            " SELECT DISTINCT quads.id " +
                " FROM atlas.records AS recs " +
                " INNER JOIN  atlas.records_quadrants AS recs_quads ON recs.id = recs_quads.records_id " +
                " INNER JOIN " + QuadrantNew.QualifiedTableName + " as quads ON recs_quads.quadrants_id = quads.id " +
                " WHERE recs.taxon_id =  " + taxonId +
                "   AND  recs.validation_status = " + statusId;

        RawSql rawSql = RawSqlBuilder.unparsed(sql)
            .columnMapping("quads.id", "id")
            .create();

        Query<QuadrantNew> query = DB.find(QuadrantNew.class);
        query.setRawSql(rawSql);

        return query.findSet();
    }

}

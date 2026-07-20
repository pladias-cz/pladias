package models;

import geom.Coordinates;
import io.ebean.Finder;
import io.ebean.Query;
import io.ebean.RawSql;
import io.ebean.RawSqlBuilder;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import platform.Srid;

@Entity
@Table(name = PhytochorionForeign.QualifiedTableName)
@SuppressWarnings("serial")
public class PhytochorionForeign extends PhytochorionBase<PhytochorionForeign> {

    public static final String QualifiedTableName = "geodata.phytochorions_outside_cz";

    public static Finder<Integer, PhytochorionForeign> find() {
        return new Finder<>(PhytochorionForeign.class);
    }

    public static PhytochorionForeign findByPoint(Coordinates coords) {
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append(" SELECT rowid, phyto_id ").
            append(" FROM ").append(QualifiedTableName).
            append(" WHERE ST_CONTAINS(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<PhytochorionForeign> query = find().query().setRawSql(rawSql);
        return query.findOne();
    }

    @Override
    protected Finder<Integer, PhytochorionForeign> findInternal() {
        return PhytochorionForeign.find();
    }

    @Override
    protected String getQualifiedTableName() {
        return QualifiedTableName;
    }

}

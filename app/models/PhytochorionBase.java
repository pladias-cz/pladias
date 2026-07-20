package models;

import geom.Coordinates;
import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import platform.Srid;

import java.util.List;

@MappedSuperclass
public abstract class PhytochorionBase<T extends PhytochorionBase<T>> extends Model {
    public static final int BufferSizeMeters = 1500;

    @Id
    protected int rowid;

    @Column(name = "phyto_id")
    private String phytoId;

    protected abstract Finder<Integer, T> findInternal();

    protected abstract String getQualifiedTableName();

    public int getRowid() {
        return rowid;
    }

    public void setRowid(int rowid) {
        this.rowid = rowid;
    }

    public String getPhytoId() {
        return phytoId;
    }

    public void setPhytoId(String phytoId) {
        this.phytoId = phytoId;
    }

    public boolean coordsWithinPolygon(Coordinates coords, int coordsPrecision) {
        return liesWithinRegion(coords, coordsPrecision);
    }

    public boolean coordsWithinBufferedPolygon(Coordinates coords, int coordsPrecision) {
        return liesWithinRegion(coords, BufferSizeMeters + coordsPrecision);
    }

    public boolean contains(Coordinates coords) {
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT rowid, phyto_id FROM ").append(getQualifiedTableName()).append("  WHERE ");
        sqlBuilder.append("ST_CONTAINS(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ").
            append(" AND phyto_id=").append("'").append(getPhytoId()).append("'");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<T> query = findInternal().query().setRawSql(rawSql);

        T identity = query.findOne();
        return (identity != null);
    }

    protected boolean liesWithinRegion(Coordinates coords, int coordsPrecision) {
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT rowid, phyto_id FROM ").append(getQualifiedTableName()).append(" WHERE ");
        sqlBuilder.append("ST_DistanceSphere(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").append(Srid.WGS84).
            append(")) <= ").append(coordsPrecision).
            append(" AND phyto_id=").append("'").append(phytoId).append("'");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<T> query = findInternal().query().setRawSql(rawSql);

        List<T> list = query.findList();
        for (T phyto : list) {
            if (phyto.getRowid() == this.rowid) {
                return true;
            }
        }
        return false;
    }
}

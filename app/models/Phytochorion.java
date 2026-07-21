package models;

import geom.Coordinates;
import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import platform.Srid;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Entity
@Table(name = Phytochorion.QualifiedTableName)
@SuppressWarnings("serial")
public class Phytochorion extends PhytochorionBase<Phytochorion> {

    public static final String QualifiedTableName = "geodata.phytochorions";

    @Column(name = "name", columnDefinition = "text")
    private String name;

    private String district;

    public static Finder<Integer, Phytochorion> find() {
        return new Finder<>(Phytochorion.class);
    }

    public static Set<Phytochorion> findByBuffer(Coordinates coords, int bufferMeters) {
        if (!coords.isValid()) {
            return new HashSet<>();
        }

        String sql;
        if (bufferMeters <= 0) {
            //validate phytochorion and the point intersect
            sql = String.format(Locale.US,
                "SELECT rowid, phyto_id, name, district FROM %s WHERE " +
                    "ST_Intersects(geom_utm, " +
                    "ST_TRANSFORM(" +
                    "ST_PointFromText('POINT(%f %f)', %d)," +
                    " %d" +
                    "))",
                QualifiedTableName,
                coords.getLongitude(), coords.getLatitude(), Srid.WGS84,
                Srid.UTM_33N);
        } else {
            //validate whether phytochorion and buffered point intersect
            sql = String.format(Locale.US,
                "SELECT rowid, phyto_id, name, district FROM %s WHERE " +
                    "ST_Intersects(geom_utm, " +
                    "ST_BUFFER(" +
                    "ST_TRANSFORM(" +
                    "ST_PointFromText('POINT(%f %f)', %d)," +
                    " %d" +
                    ")," +
                    "%d)" +
                    ")",
                QualifiedTableName,
                coords.getLongitude(), coords.getLatitude(), Srid.WGS84,
                Srid.UTM_33N,
                bufferMeters);
        }

        RawSql rawSql = RawSqlBuilder.parse(sql).create();
        Query<Phytochorion> query = find().query().setRawSql(rawSql);

        Set<Phytochorion> set = query.findSet();
        return set;
    }

    public static Phytochorion findByPoint(Coordinates coords) {
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT rowid, phyto_id ").
            append("FROM geodata.phytochorions ").
            append("WHERE ST_CONTAINS(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<Phytochorion> query = find().query().setRawSql(rawSql);
        return query.findOne();
    }

    public static Phytochorion findByPhytoId(String phytoId) {
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT rowid ").
            append("FROM geodata.phytochorions ").
            append("WHERE phyto_id='").append(phytoId).append("'");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<Phytochorion> query = find().query().setRawSql(rawSql);
        return query.findOne();
    }

    public static List<Phytochorion> getPhytochorionsSortedById() {
        String sql = "SELECT rowid, phyto_id, name, district " +
            "FROM geodata.phytochorions " +
            "ORDER BY (substring(phyto_id, '^[0-9]+'))::int ,substring(phyto_id, '[^0-9_].*$') ";

        RawSql rawSql = RawSqlBuilder.parse(sql)
            .columnMapping("phyto_id", "phytoId")
            .create();

        Query<Phytochorion> query = DB.find(Phytochorion.class);
        query.setRawSql(rawSql);
        return query.findList();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    @Override
    protected Finder<Integer, Phytochorion> findInternal() {
        return Phytochorion.find();
    }

    public void save() {
        throw new UnsupportedOperationException("Entity phytochorion is read-only.");
    }

    public void update() {
        throw new UnsupportedOperationException("Entity phytochorion is read-only.");
    }

    public String getDetailedName() {
        return String.format("%s-%s", getPhytoId(), name);
    }

    public String getCorrectName() {
        return String.format("%s. %s", getPhytoId(), name);
    }

    @Override
    public String toString() {
        return getDetailedName();
    }

    @Override
    protected String getQualifiedTableName() {
        return QualifiedTableName;
    }
}

package models;

import geom.Coordinates;
import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import platform.Srid;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "geodata.districts")
@SuppressWarnings("serial")
public class District extends Model {
    public static final int DefaultBufferMeters = 50;
    public static final int DefaultOutsideCzechiaBufferMeters = 1000;

    @Id
    private Long id;

    @Column(name = "lft")
    private long left;

    @Column(name = "rgt")
    private long right;

    @ManyToOne
    @Column(name = "depth")
    @JoinColumn(name = "depth", referencedColumnName = "id")
    private DistrictType districtType;

    private String abbrev;

    @Column(name = "identificator")
    private String identifier;

    private String name;

    public static final Finder<Long, District> find() {
        return new Finder<>(District.class);
    }

    public static boolean liesWithinTopRegion(Coordinates coords) {
        if (!coords.isValid()) {
            return false;
        }

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id ").
            append("FROM geodata.districts ").
            append("WHERE depth = ").append(DistrictType.STATE_ID).append(" AND ST_CONTAINS(").
            append("geom_wgs, ").
            append("ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ").
            append("ORDER BY depth ASC");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<District> query = find().query().setRawSql(rawSql);
        District district = query.findOne();
        return district != null;
    }

    public static District findTownByHierarchyNames(District district, String parentTown, String town) {
        if (district == null || parentTown == null || town == null) {
            return null;
        }

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id, lft, rgt, depth, abbrev, identificator, name ")
            .append("FROM geodata.districts AS query ")
            .append("WHERE depth >= ").append(DistrictType.COMMUNITY_ID).append(" AND query.lft > ").append(district.getLeft())
            .append(" AND query.rgt < ").append(district.getRight())
            .append(" AND LOWER(query.name)=LOWER('").append(town).append("')")
            .append(" AND EXISTS (")
            .append("     SELECT id ")
            .append("     FROM geodata.districts AS subquery ")
            .append("     WHERE subquery.lft > ").append(district.getLeft())
            .append("           AND subquery.rgt < ").append(district.getRight())
            .append("           AND LOWER(subquery.name)=LOWER('").append(parentTown).append("')")
            .append("           AND query.depth = subquery.depth + 1 ) ")
            .append("ORDER BY depth ASC");


        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).
            columnMapping("lft", "left").
            columnMapping("rgt", "right").
            columnMapping("depth", "districtType.id").
            columnMapping("identificator", "identifier").
            create();
        Query<District> query = find().query().setRawSql(rawSql);
        List<District> list = query.findList();
        if (list.isEmpty()) return null;
        return list.get(0);
    }

    public static List<District> findTownHierarchyByPoint(Coordinates coords) {
        if (!coords.isValid())
            return new ArrayList<District>();

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id, lft, rgt, depth, abbrev, identificator, name ").
            append("FROM geodata.districts ").
            append("WHERE depth >= ").append(DistrictType.COMMUNITY_ID).append(" AND ST_CONTAINS(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ')
            .append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ").
            append("ORDER BY depth ASC");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).
            columnMapping("lft", "left").
            columnMapping("rgt", "right").
            columnMapping("depth", "districtType.id").
            columnMapping("identificator", "identifier").
            create();
        Query<District> query = find().query().setRawSql(rawSql);
        List<District> list = query.findList();
        return list;
    }

    public static List<District> findNearestTownsByBufferedPoint(Coordinates coords, int bufferMeters, int utm_srid) {
        if (!coords.isValid())
            return new ArrayList<District>();

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id, lft, rgt, depth, abbrev, identificator, name ").
            append("FROM geodata.districts ").
            append("WHERE depth > ").append(DistrictType.DISTRICT_ID).append(" AND ST_INTERSECTS(geom_utm,").
            append("  ST_BUFFER(ST_TRANSFORM(ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').append(coords.getLatitude()).append(")',").
            append(Srid.WGS84).append("), ").append(utm_srid).append("),").append(bufferMeters).append("))");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).
            columnMapping("lft", "left").
            columnMapping("rgt", "right").
            columnMapping("depth", "districtType.id").
            columnMapping("identificator", "identifier").
            create();
        Query<District> query = find().query().setRawSql(rawSql);
        return query.findList();
    }

    public static List<District> findDistrictCandidatesByBuffer(Coordinates coords, int bufferMeters, int utm_srid) {
        if (!coords.isValid()) {
            return null;
        }

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id, lft, rgt, depth, abbrev, identificator, name ").
            append("FROM geodata.districts ").
            append("WHERE depth = ").append(DistrictType.DISTRICT_ID).append(" AND ST_INTERSECTS(geom_utm,").
            append("  ST_BUFFER(ST_TRANSFORM(ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").
            append(Srid.WGS84).append("), ").append(utm_srid).append("),").append(bufferMeters).append("))");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).
            columnMapping("lft", "left").
            columnMapping("rgt", "right").
            columnMapping("depth", "districtType.id").
            columnMapping("identificator", "identifier").
            create();
        Query<District> query = find().query().setRawSql(rawSql);
        return query.findList();
    }

    public static District findDistrictForTown(District town) {
        if (town == null || town.getDistrictType().id < DistrictType.DISTRICT_ID) {
            return null;
        }

        if (town.getDistrictType().id == DistrictType.DISTRICT_ID) {
            return town;
        }

        return District.find().query().where()
            .eq("depth", DistrictType.DISTRICT_ID)
            .lt("lft", town.left)
            .gt("rgt", town.right)
            .findOne();
    }

    public static District findDistrictByPoint(Coordinates coords) {
        if (!coords.isValid()) {
            return null;
        }

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id, lft, rgt, depth, abbrev, identificator, name ").
            append("FROM geodata.districts ").
            append("WHERE depth = ").append(DistrictType.DISTRICT_ID).append(" AND ST_CONTAINS(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).
            columnMapping("lft", "left").
            columnMapping("rgt", "right").
            columnMapping("depth", "districtType.id").
            columnMapping("identificator", "identifier").
            create();
        Query<District> query = find().query().setRawSql(rawSql);
        List<District> list = query.findList();
        if (list.isEmpty()) return null;
        return list.get(0);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public long getLeft() {
        return left;
    }

    public void setLeft(long left) {
        this.left = left;
    }

    public long getRight() {
        return right;
    }

    public void setRight(long right) {
        this.right = right;
    }

    public String getAbbrev() {
        return abbrev;
    }

    public void setAbbrev(String abbrev) {
        this.abbrev = abbrev;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public DistrictType getDistrictType() {
        return districtType;
    }

    public void setDistrictType(DistrictType districtType) {
        this.districtType = districtType;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public District findContainingTown(String containingTown) {
        List<District> list = District.find().query().where().
            gt("lft", this.getLeft()).
            lt("rgt", this.getRight()).
            eq("name", containingTown).orderBy().desc("depth").findList();
        return (list.isEmpty() ? null : list.get(0));
    }

    public String toString() {
        return name;
    }

    public boolean contains(District other) {
        if (other == null)
            return false;

        return (this.getLeft() < other.left && this.getRight() > other.getRight());
    }

}

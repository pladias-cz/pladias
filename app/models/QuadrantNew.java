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

@Entity
@Table(name = QuadrantNew.QualifiedTableName)
public class QuadrantNew extends Model {

    public static final int BufferSizeMeters = 200;
    public static final String QualifiedTableName = "geodata.quadrants_full";

    @Id
    private int id;

    @Column(name = "letter")
    private char quadrantLetter; //e.g. 'c'

    @Column(name = "code")
    private String code; //e.g. 4202c

    @ManyToOne
    @JoinColumn(name = "square_id", referencedColumnName = "id")
    @Column(name = "square_id")
    private MapSquareNew square;

    public static Finder<Long, QuadrantNew> find() {
        return new Finder<>(QuadrantNew.class);
    }

    //TODO: test
    public static QuadrantNew findByPoint(Coordinates coords) {
        if (!coords.isValid()) {
            return null;
        }

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id ").
            append("FROM ").append(QuadrantNew.QualifiedTableName).append(' ').
            append("WHERE ST_CONTAINS(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<QuadrantNew> query = find().query().setRawSql(rawSql);

        QuadrantNew quadrant = query.findOne();
        if (quadrant != null) {
            quadrant.refresh();
        }
        return quadrant;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public char getQuadrantLetter() {
        return quadrantLetter;
    }

    public void setQuadrantLetter(char quadrantLetter) {
        this.quadrantLetter = quadrantLetter;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public MapSquareNew getSquare() {
        return square;
    }

    public void setSquare(MapSquareNew square) {
        this.square = square;
    }

    //TODO: test
    public boolean liesWithinBuffer(Coordinates coords, int coordPrecisionMeters) {
        if (!coords.isValid()) {
            return false;
        }
        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id ").
            append("FROM ").append(QualifiedTableName).append(' ').
            append("WHERE ").
            append("ST_DistanceSphere(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').append(coords.getLatitude()).append(")',").append(Srid.WGS84).
            append(")) < ").append(BufferSizeMeters + coordPrecisionMeters).
            append(" AND code=").append("'").append(code).append("'");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<QuadrantNew> query = find().query().setRawSql(rawSql);

        QuadrantNew identity = query.findOne();
        return (identity != null);
    }

    //TODO test
    public boolean contains(Coordinates coords) {
        if (!coords.isValid())
            return false;

        StringBuilder sqlBuilder = new StringBuilder();
        sqlBuilder.append("SELECT id ").
            append("FROM ").append(QuadrantNew.QualifiedTableName).append(' ').
            append("WHERE ").
            append("ST_CONTAINS(geom_wgs, ST_PointFromText('POINT(").
            append(coords.getLongitude()).append(' ').
            append(coords.getLatitude()).append(")',").append(Srid.WGS84).append(")) ").
            append("AND code=").append("'").append(code).append("'");

        RawSql rawSql = RawSqlBuilder.parse(sqlBuilder.toString()).create();
        Query<QuadrantNew> query = find().query().setRawSql(rawSql);

        QuadrantNew identity = query.findOne();
        return (identity != null);
    }

    @Override
    public void save() {
        throw new UnsupportedOperationException("this entity is read only");
    }

    @Override
    public void update() {
        throw new UnsupportedOperationException("this entity is read only");
    }

    public String toString() {
        return code;
    }

    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (!(o instanceof QuadrantNew other)) {
            return false;
        }

        return (id == other.id);
    }

    public int hashCode() {
        return id * 17 + 7;
    }
}

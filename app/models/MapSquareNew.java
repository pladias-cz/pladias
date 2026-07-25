package models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import db.DatabaseContext;
import geom.LinearRing;
import geom.Point;
import io.ebean.Finder;
import io.ebean.Model;
import io.ebean.SqlRow;
import jakarta.persistence.*;
import org.postgis.Polygon;
import platform.Srid;

import java.sql.SQLException;

@Entity
@Table(name = MapSquareNew.QualifiedTableName)
public class MapSquareNew extends Model {

    public static final String QualifiedTableName = "geodata.squares_full";

    @Id
    private int id;

    @Transient
    @JsonIgnore
    private Point centroid;

    @Column(name = "code")
    private String code;

    /**
     * Vytvoří Finder pro aktuálně vybraný databázový server.
     * Respektuje DatabaseContext kontext (master nebo replica).
     *
     * @return Finder připojený k aktuální databázi
     */
    public static Finder<Integer, MapSquareNew> find() {
        // DEBUG: Ověření že se opravdu použije replica když je nastavena
        String currentDb = DatabaseContext.getCurrentDatabase();
        System.out.println("### MapSquareNew.find() - aktuální DB kontext: " + currentDb);
        if ("replica".equals(currentDb)) {
            System.out.println("### ✓ PRÁVĚ BĚŽÍ NA REPLICE!");
        } else {
            System.out.println("### ℹ BĚŽÍ NA MASTERU (default)");
        }
        return new Finder<>(MapSquareNew.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    /**
     * Získá centroid čtverce.
     *
     * @return Point s centroidem ve WGS84
     */
    public Point getCentroid() {
        if (centroid == null) {
            String sql = " SELECT ST_X(ST_CENTROID(geom_wgs)) AS LON, ST_Y(ST_CENTROID(geom_wgs)) AS LAT " +
                " FROM " + MapSquareNew.QualifiedTableName +
                " WHERE id=:id;";

            try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
                SqlRow row = DatabaseContext.getDatabase().sqlQuery(sql).setParameter("id", id).findOne();
                centroid = new Point(row.getDouble("LON"), row.getDouble("LAT"), Srid.WGS84);
            }
        }
        return centroid;
    }

    /**
     * Získá hranici čtverce jako LinearRing.
     *
     * @return LinearRing hranice čtverce
     * @throws SQLException pokud selže databázový dotaz
     */
    public LinearRing getLinearRing() throws SQLException {
        String sql = "SELECT ST_ASTEXT(Box2D(geom_wgs)) AS polygon FROM " + MapSquareNew.QualifiedTableName +
            " WHERE id = :squareId;";

        // DEBUG: Ověření databázového kontextu
        String currentDbBefore = DatabaseContext.getCurrentDatabase();
        System.out.println("### MapSquareNew.getLinearRing() - před přepnutím: " + currentDbBefore);

        try (DatabaseContext.Scope replica = DatabaseContext.useReplica()) {
            String currentDbInside = DatabaseContext.getCurrentDatabase();
            System.out.println("### MapSquareNew.getLinearRing() - uvnitř try bloku: " + currentDbInside);
            SqlRow row = DatabaseContext.getDatabase().sqlQuery(sql).setParameter("squareId", id).findOne();
            String polygonDefinition = row.getString("polygon");

            Polygon poly = new Polygon(polygonDefinition);
            org.postgis.LinearRing ring = poly.getRing(0);
            return new LinearRing(ring);
        }
    }

    public void save() {
        throw new UnsupportedOperationException("this entity is read only");
    }

    public void update() {
        throw new UnsupportedOperationException("this entity is read only");
    }

    public int hashCode() {
        return id * 17 + 7;
    }

    public boolean equals(Object other) {
        if (!(other instanceof MapSquareNew))
            return false;
        return id == ((MapSquareNew) other).id;
    }
}

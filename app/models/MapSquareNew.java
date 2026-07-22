package models;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
        return BaseModel.find(MapSquareNew.class);
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
     * <p>SQL dotaz automaticky použije aktuální databázový kontext
     * (master nebo replica dle {@link db.DatabaseContext}).</p>
     * 
     * @return Point s centroidem ve WGS84
     */
    public Point getCentroid() {
        if (centroid == null) {
            String sql = " SELECT ST_X(ST_CENTROID(geom_wgs)) AS LON, ST_Y(ST_CENTROID(geom_wgs)) AS LAT " +
                " FROM " + MapSquareNew.QualifiedTableName +
                " WHERE id=:id;";

            // Použije aktuální database kontext (master nebo replica)
            SqlRow row = BaseModel.currentDb().sqlQuery(sql).setParameter("id", id).findOne();
            centroid = new Point(row.getDouble("LON"), row.getDouble("LAT"), Srid.WGS84);
        }
        return centroid;
    }

    /**
     * Získá hranici čtverce jako LinearRing.
     * 
     * <p>SQL dotaz automaticky použije aktuální databázový kontext
     * (master nebo replica dle {@link db.DatabaseContext}).</p>
     * 
     * @return LinearRing hranice čtverce
     * @throws SQLException pokud selže databázový dotaz
     */
    public LinearRing getLinearRing() throws SQLException {
        String sql = "SELECT ST_ASTEXT(Box2D(geom_wgs)) AS polygon FROM " + MapSquareNew.QualifiedTableName +
            " WHERE id = :squareId;";
        
        // Použije aktuální database kontext (master nebo replica)
        SqlRow row = BaseModel.currentDb().sqlQuery(sql).setParameter("squareId", id).findOne();
        String polygonDefinition = row.getString("polygon");

        Polygon poly = new Polygon(polygonDefinition);
        org.postgis.LinearRing ring = poly.getRing(0);
        return new LinearRing(ring);
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

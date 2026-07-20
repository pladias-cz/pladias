package models;

import io.ebean.*;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import play.data.validation.Constraints.Required;

@Entity
@Table(name = DistrictType.QualifiedTableName)
@SuppressWarnings("serial")
public class DistrictType extends Model {
    public static final String QualifiedTableName = "geodata.districts_depth";

    public static final int STATE_ID = 0;
    public static final int REGION_OF_CONSISTENCY_ID = 1;
    public static final int REGION_ID = 2; //kraj
    public static final int DISTRICT_ID = 3; //okres
    public static final int COMMUNITY_ID = 4; //obec
    public static final int CATASTRAL_UNIT_ID = 5; //obec
    public static final int BASIC_MUNICIPAL_UNIT_ID = 6; //zakl. sidelni jednotka

    @Id
    public long id;

    @Required
    public String name;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void save() {
        throw new UnsupportedOperationException("Entity districtType is read-only.");
    }

    public void update() {
        throw new UnsupportedOperationException("Entity districtType is read-only.");
    }
}

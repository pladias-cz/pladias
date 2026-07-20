package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Table(name = VisibilityStatus.QualifiedName)
@Entity
public class VisibilityStatus {

    public static final int TraitAdminAccessId = 1;
    public static final int RegisteredAccessId = 3;
    public static final int PublicAccessId = 4;
    public static final String QualifiedName = "measurements.trait_visibility_status";
    @Id
    private int id;
    @Column(name = "name_cz")
    private String descriptionCz;

    public static final Finder<Integer, VisibilityStatus> find() {
        return new Finder<>(VisibilityStatus.class);
    }


    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getDescriptionCz() {
        return descriptionCz;
    }

    public void setDescriptionCz(String desriptionCz) {
        this.descriptionCz = desriptionCz;
    }

    public boolean isAdmin() {
        return id == TraitAdminAccessId;
    }
}

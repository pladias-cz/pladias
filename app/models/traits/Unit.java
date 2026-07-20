package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@SuppressWarnings("serial")
@Table(name = Unit.QualifiedName)
@Entity
public class Unit extends Model {
    public static final String QualifiedName = "measurements.units";
    @Id
    private int id;
    @Column(name = "name_cz", nullable = false)
    private String nameCz;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    private String abbrev;

    @Column(name = "description_cs")
    private String descriptionCz;

    @Column(name = "description_en")
    private String descriptionEn;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNameCz() {
        return nameCz;
    }

    public void setNameCz(String nameCz) {
        this.nameCz = nameCz;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public String getAbbrev() {
        return abbrev;
    }

    public void setAbbrev(String abbrev) {
        this.abbrev = abbrev;
    }

    public String getDescriptionCz() {
        return descriptionCz;
    }

    public void setDescriptionCz(String descriptionCz) {
        this.descriptionCz = descriptionCz;
    }

    public String getDescriptionEn() {
        return descriptionEn;
    }

    public void setDescriptionEn(String descriptionEn) {
        this.descriptionEn = descriptionEn;
    }
}


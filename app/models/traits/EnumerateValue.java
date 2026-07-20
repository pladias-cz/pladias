package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@SuppressWarnings("serial")
@Table(name = EnumerateValue.QualifiedName)
@Entity
public class EnumerateValue extends Model {
    public static final String QualifiedName = "measurements.enumerates_values";

    @Id
    private int id;

    @Column(name = "enumerate_id", nullable = false)
    private int enumerateId;

    @Column(name = "name_cz", nullable = true)
    private String nameCz;

    @Column(name = "name_en", nullable = true)
    private String nameEn;

    @Column(name = "description_cs", nullable = true)
    private String descriptionCz;

    @Column(name = "description_en", nullable = true)
    private String descriptionEn;

    @Column(name = "succession", nullable = true)
    private Integer succession;

    @Column(name = "foreign_id", nullable = true)
    private String foreignId;

    public static final Finder<Integer, EnumerateValue> find() {
        return new Finder<>(EnumerateValue.class);
    }

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

    public Integer getSuccession() {
        return succession;
    }

    public void setSuccession(Integer succession) {
        this.succession = succession;
    }

    public String getForeignId() {
        return foreignId;
    }

    public void setForeignKey(String foreignId) {
        this.foreignId = foreignId;
    }

    public int getEnumerateId() {
        return enumerateId;
    }

    public void setEnumerateId(int enumerateId) {
        this.enumerateId = enumerateId;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof EnumerateValue otherEnumVal)) {
            return false;
        }

        return (id == otherEnumVal.id);
    }

    @Override
    public int hashCode() {
        return (id * 67);
    }
}

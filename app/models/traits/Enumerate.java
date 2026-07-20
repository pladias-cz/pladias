package models.traits;

import io.ebean.*;
import jakarta.persistence.*;
import models.User;

import java.util.List;

@Table(name = Enumerate.QualifiedName)
@Entity
public class Enumerate extends Model {

    public static final String QualifiedName = "measurements.enumerates";
    @Id
    private int id;
    @Column(name = "name_cz", nullable = false)
    private String nameCz;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "description_cs")
    private String descriptionCz;

    @Column(name = "description_en")
    private String descriptionEn;

    @ManyToOne
    @Column(name = "administrator")
    @JoinColumn(name = "administrator", referencedColumnName = "id")
    private User administrator;

    @Transient
    private List<EnumerateValue> enumValues;

    public static final Finder<Integer, Enumerate> find() {
        return new Finder<>(Enumerate.class);
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

    public User getAdministrator() {
        return administrator;
    }

    public void setAdministrator(User administrator) {
        this.administrator = administrator;
    }

    public List<EnumerateValue> getEnumerateValues() {
        if (enumValues == null) {
            enumValues = EnumerateValue.find().query()
                .where()
                .eq("enumerateId", id)
                .orderBy().asc("succession").orderBy().asc("id")
                .findList();
        }
        return enumValues;
    }

    public List<Feature> getUsedByFeatures() {
        return Feature.find().query().where().eq("enumerate.id", id).findList();
    }
}

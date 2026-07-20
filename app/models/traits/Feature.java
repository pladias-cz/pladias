package models.traits;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.*;
import models.User;

import java.util.List;

@Entity
@Table(name = Feature.QualifiedName)
@SuppressWarnings("serial")
public class Feature extends Model {
    public static final String QualifiedName = "measurements.features";
    @Id
    private int id;
    @Column(name = "name_cz", nullable = false)
    private String nameCz;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @ManyToOne
    @Column(name = "section_id")
    @JoinColumn(name = "section_id", referencedColumnName = "id")
    private Section section;

    @Column(name = "description_cs")
    private String descriptionCz;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "bibliography_cs")
    private String bibliographyCz;

    @Column(name = "bibliography_en")
    private String bibliographyEn;

    @Column(name = "explanation_cs")
    private String explanationCz;

    @Column(name = "explanation_en")
    private String explanationEn;

    @ManyToOne
    @Column(name = "administrator", nullable = false)
    @JoinColumn(name = "administrator", referencedColumnName = "id")
    private User admin;

    @ManyToOne
    @Column(name = "datatype_id", nullable = false)
    @JoinColumn(name = "datatype_id", referencedColumnName = "id")
    private Datatype datatype;

    @ManyToOne
    @Column(name = "unit_id")
    @JoinColumn(name = "unit_id", referencedColumnName = "id")
    private Unit unit;

    private Double maximum;

    private Double minimum;

    @Column(name = "external_id")
    private String externalId;

    @Column(name = "syntaxon_restricted_rank_id")
    private Integer syntaxonRestrictedRankId;

    private int succession;

    @ManyToOne
    @JoinColumn(name = "enumerate", referencedColumnName = "id")
    private Enumerate enumerate;

    @ManyToOne
    @Column(name = "inheritance_id")
    @JoinColumn(name = "inheritance_id", referencedColumnName = "id")
    private InheritanceType inheritanceType;

    public static final Finder<Integer, Feature> find() {
        return new Finder<>(Feature.class);
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

    public Section getSection() {
        return section;
    }

    public void setSection(Section section) {
        this.section = section;
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

    public String getBibliographyCz() {
        return bibliographyCz;
    }

    public void setBibliographyCz(String bibliographyCz) {
        this.bibliographyCz = bibliographyCz;
    }

    public String getBibliographyEn() {
        return bibliographyEn;
    }

    public void setBibliographyEn(String bibliographyEn) {
        this.bibliographyEn = bibliographyEn;
    }

    public String getExplanationCz() {
        return explanationCz;
    }

    public void setExplanationCz(String explanationCz) {
        this.explanationCz = explanationCz;
    }

    public String getExplanationEn() {
        return explanationEn;
    }

    public void setExplanationEn(String explanationEn) {
        this.explanationEn = explanationEn;
    }

    public User getAdmin() {
        return admin;
    }

    public void setAdmin(User admin) {
        this.admin = admin;
    }

    public Datatype getDatatype() {
        return datatype;
    }

    public void setDatatype(Datatype datatype) {
        this.datatype = datatype;
    }

    public Unit getUnit() {
        return unit;
    }

    public void setUnit(Unit unit) {
        this.unit = unit;
    }

    public Double getMaximum() {
        return maximum;
    }

    public void setMaximum(Double maximum) {
        this.maximum = maximum;
    }

    public Double getMinimum() {
        return minimum;
    }

    public void setMinimum(Double minimum) {
        this.minimum = minimum;
    }

    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public Integer getSyntaxonRestrictedRankId() {
        return syntaxonRestrictedRankId;
    }

    public void setSyntaxonRestrictedRankId(Integer syntaxonRestrictedRankId) {
        this.syntaxonRestrictedRankId = syntaxonRestrictedRankId;
    }

    public int getSuccession() {
        return succession;
    }

    public void setSuccession(int succession) {
        this.succession = succession;
    }

    public Enumerate getEnumerate() {
        return enumerate;
    }

    public void setEnumerate(Enumerate enumerate) {
        this.enumerate = enumerate;
    }

    public InheritanceType getInheritanceType() {
        return inheritanceType;
    }

    public void setInheritanceType(InheritanceType inheritanceType) {
        this.inheritanceType = inheritanceType;
    }

    public synchronized List<Trait> getSubordinateTraits() {
        return getTraitsByDeletionStatus(false);
    }

    public synchronized List<Trait> getdeletedTraits() {
        return getTraitsByDeletionStatus(true);
    }

    public boolean supportsComputedValues() {
        int inhTypeId = inheritanceType.getId();
        return (inhTypeId != InheritanceType.Excluded &&
            inhTypeId != InheritanceType.Distribution);
    }

    private List<Trait> getTraitsByDeletionStatus(boolean deleted) {
        return Trait.find().query().where().eq("feature_id", id).eq("deleted", deleted).orderBy("id").findList();
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof Feature otherFeature)) {
            return false;
        }

        return (id == otherFeature.id);
    }

    @Override
    public int hashCode() {
        return (id * 67);
    }
}

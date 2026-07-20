package models.traits;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@SuppressWarnings("serial")
@Table(name = Datatype.QualifiedName)
@Entity
public class Datatype extends Model {
    public static final int BooleanDatatypeId = 1;
    public static final int IntegerDatatypeId = 2;
    public static final int IntervalAvgDatatypeId = 3;
    public static final int IntervalModDatatypeId = 4;
    public static final int EnumNominalDatatypeId = 5;
    public static final int EnumOrdinalDatatypeId = 6;
    public static final int MonthDatatypeId = 7;
    public static final int PercentageDatatypeId = 8;
    public static final int YearDatatypeId = 9;
    public static final int IntegerIndicatorsDatatypeId = 10;
    public static final int EnumSyntaxonsDatatypeId = 11;
    public static final int CrossTaxonDatatypeId = 13;
    public static final int RealDatatypeId = 14;
    public static final int EnumOrdinalSingleDatatypeId = 15;
    public static final int RealMultiDatatypeId = 16;
    public static final int DistributionDatatypeId = 17;
    public static final String QualifiedName = "measurements.datatypes";
    @Id
    private int id;
    @Column(name = "key", nullable = false)
    private String key;

    @Column(name = "name_cz", nullable = false)
    private String nameCz;

    @Column(name = "tablename", nullable = false)
    private String tableName;

    @Column(name = "description_cs")
    private String descriptionCz;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "multiplicity")
    private Boolean multiplicity;

    @Column(name = "dominant_value", nullable = false)
    private boolean dominantValue;

    @Column(name = "frequency")
    private Boolean frequency;

    @Column(name = "unmeasurable")
    private boolean unmeasurable;

    @Column(name = "value_comment")
    private boolean commentable;


    public static final Finder<Integer, Datatype> find() {
        return new Finder<>(Datatype.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getNameCz() {
        return nameCz;
    }

    public void setNameCz(String nameCz) {
        this.nameCz = nameCz;
    }

    public String getTableName() {
        return tableName;
    }

    public void setTableName(String tableName) {
        this.tableName = tableName;
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

    public Boolean getMultiplicity() {
        return multiplicity;
    }

    public void setMultiplicity(Boolean multiplicity) {
        this.multiplicity = multiplicity;
    }

    public boolean isDominantValue() {
        return dominantValue;
    }

    public void setDominantValue(boolean dominantValue) {
        this.dominantValue = dominantValue;
    }

    public Boolean getFrequency() {
        return frequency;
    }

    public void setFrequency(Boolean frequency) {
        this.frequency = frequency;
    }

    public boolean isUnmeasurable() {
        return unmeasurable;
    }

    public void setUnmeasurable(boolean unmeasurable) {
        this.unmeasurable = unmeasurable;
    }

    public boolean isCommentable() {
        return commentable;
    }

    public void setCommentable(boolean commentable) {
        this.commentable = commentable;
    }
}

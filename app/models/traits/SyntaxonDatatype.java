package models.traits;

import io.ebean.*;
import jakarta.persistence.*;

@Entity
@Table(name = SyntaxonDatatype.QualifiedTableName)
@SuppressWarnings("serial")
public class SyntaxonDatatype extends Model {

    public static final String QualifiedTableName = "measurements.data_enum_syntaxons";
    @Id
    @Embedded
    private SyntaxonDatatypePK datatypePk;
    @Column(nullable = true)
    private Boolean dominant;
    @Column(nullable = true)
    private Integer frequency;
    private boolean value;

    public static final Finder<SyntaxonDatatypePK, SyntaxonDatatype> find() {
        return new Finder<SyntaxonDatatypePK, SyntaxonDatatype>(SyntaxonDatatype.class);
    }

    public SyntaxonDatatypePK getSytaxonDatatypePK() {
        return datatypePk;
    }

    public void setSytaxonDatatypePK(SyntaxonDatatypePK pk) {
        this.datatypePk = pk;
    }

    public boolean isDominant() {
        return dominant;
    }

    public void setDominant(Boolean dominant) {
        this.dominant = dominant;
    }

    public Integer getFrequency() {
        return frequency;
    }

    public void setFrequency(Integer frequency) {
        this.frequency = frequency;
    }

    public boolean isValue() {
        return value;
    }

    public void setValue(boolean value) {
        this.value = value;
    }
}

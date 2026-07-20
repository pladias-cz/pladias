package models.traits;

import io.ebean.*;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@SuppressWarnings("serial")
@Table(name = CrossTaxonDatatype.QualifiedTableName)
@Entity
public class CrossTaxonDatatype extends Model {
    public static final String QualifiedTableName = "measurements.data_taxon_taxon_real";
    @Id
    @Embedded
    private CrossTaxonDatatypePK datatypePk;
    private double value;

    public static final Finder<CrossTaxonDatatypePK, CrossTaxonDatatype> find() {
        return new Finder<>(CrossTaxonDatatype.class);
    }

    public CrossTaxonDatatypePK getDatatypePk() {
        return datatypePk;
    }

    public void setDatatypePk(CrossTaxonDatatypePK pk) {
        this.datatypePk = pk;
    }

    public double getValue() {
        return value;
    }

    public void setValue(double value) {
        this.value = value;
    }
}

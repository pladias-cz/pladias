package models.traits;

import io.ebean.Finder;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = RealDatatype.QualifiedTableName)
@SuppressWarnings("serial")
public class RealDatatype extends AbstractDatatype {
    public static final String QualifiedTableName = "measurements.data_real";
    @Column(name = "value")
    private double value;

    public static final Finder<DatatypePK, RealDatatype> find() {
        return new Finder<>(RealDatatype.class);
    }

    public double getValue() {
        return value;
    }

    public void setValue(double value) {
        this.value = value;
    }
}

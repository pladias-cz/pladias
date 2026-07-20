package models.traits;

import io.ebean.*;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;


@Entity
@Table(name = PercentageDatatype.QualifiedTableName)
@SuppressWarnings("serial")
public class PercentageDatatype extends AbstractDatatype {
    public static final String QualifiedTableName = "measurements.data_percentage";
    private double value;

    public static final Finder<DatatypePK, PercentageDatatype> find() {
        return new Finder<>(PercentageDatatype.class);
    }

    public double getValue() {
        return value;
    }

    public void setValue(double value) {
        this.value = value;
    }
}

package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = BoolDatatype.QualifiedTableName)
@SuppressWarnings("serial")
public class BoolDatatype extends AbstractDatatype {
    public static final String QualifiedTableName = "measurements.data_boolean";
    @Column(name = "value")
    private boolean value;

    public static final Finder<DatatypePK, BoolDatatype> find() {
        return new Finder<>(BoolDatatype.class);
    }

    public boolean isValue() {
        return value;
    }

    public void setValue(boolean value) {
        this.value = value;
    }

}

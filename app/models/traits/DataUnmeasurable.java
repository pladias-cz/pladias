package models.traits;

import io.ebean.*;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = DataUnmeasurable.QualifiedName)
@SuppressWarnings("serial")
public class DataUnmeasurable extends Model {

    public static final String QualifiedName = "measurements.data_unmeasurable";
    @Id
    @Embedded
    DatatypePK datatypePk;

    public static final Finder<DatatypePK, DataUnmeasurable> find() {
        return new Finder<>(DataUnmeasurable.class);
    }

    public DatatypePK getDatatypePK() {
        return datatypePk;
    }

    public void setDatatypePK(DatatypePK pk) {
        this.datatypePk = pk;
    }
}

package models.traits;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.*;

@Entity
@Table(name = EnumerateDatatype.QualifiedTableName)
public class EnumerateDatatype extends Model {
    public static final String QualifiedTableName = "measurements.data_enum";
    @Id
    @Embedded
    private EnumerateDatatypePK datatypePk;
    @Column
    private boolean dominant;
    @Column(nullable = true)
    private Integer frequency;


    public EnumerateDatatype() {
	   /* hack: if setDominant() is not called, Ebean will assume that this non-nullable field
	      has not been set and will avoid saving the entity to the DB.
	    */
        setDominant(false);
    }

    public static final Finder<Integer, EnumerateDatatype> find() {
        return new Finder<Integer, EnumerateDatatype>(EnumerateDatatype.class);
    }

    public boolean getDominant() {
        return dominant;
    }

    public void setDominant(boolean dominant) {
        this.dominant = dominant;
    }

    public Integer getFrequency() {
        return frequency;
    }

    public void setFrequency(Integer frequency) {
        this.frequency = frequency;
    }

    public EnumerateDatatypePK getDatatypePk() {
        return datatypePk;
    }

    public void setDatatypePk(EnumerateDatatypePK datatypePk) {
        this.datatypePk = datatypePk;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (!(o instanceof EnumerateDatatype other))
            return false;

        return datatypePk.equals(other.datatypePk) &&
            dominant == other.dominant &&
            frequency == other.frequency;
    }

    @Override
    public int hashCode() {
        return datatypePk.hashCode();
    }
}

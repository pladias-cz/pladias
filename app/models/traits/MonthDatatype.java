package models.traits;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = MonthDatatype.QualifiedTableName)
@SuppressWarnings("serial")
public class MonthDatatype extends Model {

    public final static int MONTH_COUNT = 12;

    public static final String QualifiedTableName = "measurements.data_month";
    @EmbeddedId
    private MonthDatatypePK datatypePk;
    @Column(name = "dominant")
    private boolean dominant = false; //default value

    public static final Finder<MonthDatatypePK, MonthDatatype> find() {
        return new Finder<>(MonthDatatype.class);
    }

    public boolean getDominant() {
        return dominant;
    }

    public void setDominant(boolean dominant) {
        this.dominant = dominant;
    }

    public MonthDatatypePK getDatatypePk() {
        return datatypePk;
    }

    public void setDatatypePk(MonthDatatypePK pk) {
        this.datatypePk = pk;
    }

}

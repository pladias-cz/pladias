package models.traits;

import io.ebean.Finder;
import jakarta.persistence.*;

import java.util.Objects;

@Entity
@Table(name = YearDatatype.QualifiedTableName)
public class YearDatatype extends BaseDatatype {
    public static final String QualifiedTableName = "measurements.data_year";
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "measurements.data_year_id_seq")
    private int id;
    @Column(name = "value")
    private int value;
    @Column(name = "before")
    private boolean before;
    @Column(name = "after")
    private boolean after;

    public static final Finder<Integer, YearDatatype> find() {
        return new Finder<>(YearDatatype.class);
    }

    public boolean isBefore() {
        return before;
    }

    public void setBefore(boolean before) {
        this.before = before;
    }

    public boolean isAfter() {
        return after;
    }

    public void setAfter(boolean after) {
        this.after = after;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (getClass() != o.getClass())
            return false;


        YearDatatype other = (YearDatatype) o;
        return super.equals(other) &&
            before == other.before &&
            after == other.after &&
            value == other.value;
    }

    @Override
    public int hashCode() {
        return super.hashCode() + Objects.hash(before, after, value);
    }
}

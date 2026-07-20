package models.traits;

import io.ebean.Finder;
import jakarta.persistence.*;

@Entity
@Table(name = IntegerDatatype.QualifiedTableName)
public class IntegerDatatype extends BaseDatatype {
    public static final String QualifiedTableName = "measurements.data_integer";
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "measurements.data_integer_id_seq")
    private int id;
    @Column(name = "frequency", nullable = true)
    private Integer frequency;
    @Column(name = "value")
    private int value;

    public static final Finder<Integer, IntegerDatatype> find() {
        return new Finder<>(IntegerDatatype.class);
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public Integer getFrequency() {
        return frequency;
    }

    public void setFrequency(Integer frequency) {
        this.frequency = frequency;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (getClass() != o.getClass())
            return false;


        IntegerDatatype other = (IntegerDatatype) o;
        return super.equals(other) &&
            frequency == other.frequency &&
            value == other.value;
    }

    @Override
    public int hashCode() {
        return super.hashCode() +
            (frequency != null ? 31 * frequency : 0) +
            (value * 37);
    }
}

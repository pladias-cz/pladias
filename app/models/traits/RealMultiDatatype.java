package models.traits;

import io.ebean.Finder;
import jakarta.persistence.*;

@Entity
@Table(name = RealMultiDatatype.QualifiedTableName)
public class RealMultiDatatype extends BaseDatatype {
    public static final String QualifiedTableName = "measurements.data_real_multi";
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "measurements.data_real_multi_id_seq")
    private int id;
    @Column(name = "value")
    private double value;

    public static final Finder<Integer, RealMultiDatatype> find() {
        return new Finder<>(RealMultiDatatype.class);
    }

    public double getValue() {
        return value;
    }

    public void setValue(double value) {
        this.value = value;
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof RealMultiDatatype other)) {
            return false;
        }

        return (super.equals(other) &&
            value == other.value);
    }

    @Override
    public int hashCode() {
        return (super.hashCode() + (int) value * 32609);
    }

}

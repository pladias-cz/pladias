package models.traits;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.Objects;

@Embeddable
public class MonthDatatypePK extends DatatypePK {

    @Column(name = "minimum")
    private int minimum;

    @Column(name = "maximum")
    private int maximum;

    public int getMinimum() {
        return minimum;
    }

    public void setMinimum(int minimum) {
        this.minimum = minimum;
    }

    public int getMaximum() {
        return maximum;
    }

    public void setMaximum(int maximum) {
        this.maximum = maximum;
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof MonthDatatypePK other)) {
            return false;
        }

        return (traitId == other.traitId &&
            taxonId == other.taxonId &&
            minimum == other.minimum &&
            maximum == other.maximum &&
            entryType == other.entryType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(traitId, taxonId, entryType, minimum, maximum);
    }
}

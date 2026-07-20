package models.traits;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.util.Objects;

@Embeddable
public class EnumerateDatatypePK extends DatatypePK {

    @Column(name = "value")
    private int value;

    @Column(name = "is_enabled", nullable = false)
    private boolean enabled = true;

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this)
            return true;

        if (!(o instanceof EnumerateDatatypePK other)) {
            return false;
        }

        return super.equals(other) &&
            enabled == other.enabled &&
            value == other.value;
    }

    @Override
    public int hashCode() {
        return super.hashCode() ^ Objects.hash(value, enabled);
    }
}

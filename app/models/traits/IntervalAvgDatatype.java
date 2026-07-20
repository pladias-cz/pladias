package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@SuppressWarnings("serial")
@Entity
@Table(name = IntervalAvgDatatype.QualifiedTableName)
public class IntervalAvgDatatype extends AbstractDatatype {
    public static final String QualifiedTableName = "measurements.data_interval_avg";
    @Column(nullable = true, name = "minimum")
    private Double minimum;
    @Column(nullable = true, name = "maximum")
    private Double maximum;
    @Column(nullable = true, name = "subminimum")
    private Double extremeMinimum;
    @Column(nullable = true, name = "supramaximum")
    private Double extremeMaximum;
    @Column(nullable = true, name = "mean")
    private Double mean;
    @Column(nullable = true, name = "sem")
    private Double standardMeanError;

    public static final Finder<DatatypePK, IntervalAvgDatatype> find() {
        return new Finder<>(IntervalAvgDatatype.class);
    }

    public Double getMinimum() {
        return minimum;
    }

    public void setMinimum(Double minimum) {
        this.minimum = minimum;
    }

    public Double getMaximum() {
        return maximum;
    }

    public void setMaximum(Double maximum) {
        this.maximum = maximum;
    }

    public Double getExtremeMinimum() {
        return extremeMinimum;
    }

    public void setExtremeMinimum(Double extremeMinimum) {
        this.extremeMinimum = extremeMinimum;
    }

    public Double getExtremeMaximum() {
        return extremeMaximum;
    }

    public void setExtremeMaximum(Double extremeMaximum) {
        this.extremeMaximum = extremeMaximum;
    }

    public Double getMean() {
        return mean;
    }

    public void setMean(Double mean) {
        this.mean = mean;
    }

    public Double getStandardMeanError() {
        return standardMeanError;
    }

    public void setStandardMeanError(Double standardMeanError) {
        this.standardMeanError = standardMeanError;
    }
}

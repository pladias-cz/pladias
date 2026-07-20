package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

//binds to a read-only materialized view
@SuppressWarnings("serial")
@Table(name = DistributionReadOnlyDatatype.QualifiedName)
@Entity
public class DistributionReadOnlyDatatype extends Model {
    public static final String QualifiedName = "measurements.m_occurrence_frequency";
    @Column(name = "taxon_id")
    public long taxonId;
    @Column(name = "quadrant")
    private Integer quadrant;
    @Column(name = "square")
    private Integer square;

    public static final Finder<Long, DistributionReadOnlyDatatype> find() {
        return new Finder<>(DistributionReadOnlyDatatype.class);
    }

    public long getTaxonId() {
        return taxonId;
    }

    public void setTaxonId(long taxonId) {
        this.taxonId = taxonId;
    }

    public Integer getQuadrant() {
        return quadrant;
    }

    public void setQuadrant(Integer quadrant) {
        this.quadrant = quadrant;
    }

    public Integer getSquare() {
        return square;
    }

    public void setSquare(Integer square) {
        this.square = square;
    }
}

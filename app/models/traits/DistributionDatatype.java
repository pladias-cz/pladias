package models.traits;

import io.ebean.Finder;
import jakarta.persistence.*;

@Table(name = DistributionDatatype.QualifiedTableName)
@Entity
public class DistributionDatatype extends BaseDatatype {
    public static final String QualifiedTableName = "measurements.data_occurrence_frequency";
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "measurements.data_occurrence_frequency_id_seq")
    private int id;
    @Column(name = "quadrant_count")
    private int quadrantsCount;
    @Column(name = "square_count")
    private int squaresCount;

    public static final Finder<Integer, DistributionDatatype> find() {
        return new Finder<>(DistributionDatatype.class);
    }

    public int getQuadrantsCount() {
        return quadrantsCount;
    }

    public void setQuadrantsCount(int quadrantsCount) {
        this.quadrantsCount = quadrantsCount;
    }

    public int getSquaresCount() {
        return squaresCount;
    }

    public void setSquaresCount(int squaresCount) {
        this.squaresCount = squaresCount;
    }
}

package models.traits;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Transient;

import models.Taxon;
import repositories.TaxonRepository;

@Embeddable
public class CrossTaxonDatatypePK extends DatatypePK {
    @Column(name = "taxon_id2")
    private long taxonId2;

    @Transient
    private Taxon taxon2;

    public Taxon getTaxon2() {
        if (taxon2 == null) {
            taxon2 = TaxonRepository.getInstance().getById(taxonId2);
        }
        return taxon2;
    }

    public long getTaxonId2() {
        return taxonId2;
    }

    public void setTaxonId2(long taxonId) {
        this.taxonId2 = taxonId;
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof CrossTaxonDatatypePK other)) {
            return false;
        }

        return (getTraitId() == other.getTraitId() &&
            getTaxonId() == other.getTaxonId() &&
            taxonId2 == other.getTaxonId2());
    }

    @Override
    public int hashCode() {
        return (int) (getTraitId() * 17 + getTaxonId() * 31 + taxonId2 * 37);
    }
}

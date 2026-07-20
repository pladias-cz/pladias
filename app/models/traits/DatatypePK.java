package models.traits;


import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Transient;
import models.Taxon;
import models.traitsExport.TraitDetailsEntryType;
import repositories.TaxonRepository;

import java.util.Objects;

@Embeddable
public class DatatypePK {
    @Column(name = "trait_id")
    public long traitId;

    @Column(name = "taxon_id")
    public long taxonId;

    @Column(name = "entry_type")
    public int entryType = TraitDetailsEntryType.Original.getIndex();

    @Transient
    private Taxon taxon;

    public long getTraitId() {
        return traitId;
    }

    public void setTraitId(long traitId) {
        this.traitId = traitId;
    }

    public long getTaxonId() {
        return taxonId;
    }

    public void setTaxonId(long taxonId) {
        this.taxonId = taxonId;
    }

    public Taxon getTaxon() {
        if (taxon == null) {
            taxon = TaxonRepository.getInstance().getById(taxonId);
        }
        return taxon;
    }

    public int getEntryType() {
        return entryType;
    }

    public void setEntryType(int entryType) {
        this.entryType = entryType;
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof DatatypePK other)) {
            return false;
        }

        return (traitId == other.traitId &&
            taxonId == other.taxonId &&
            entryType == other.entryType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(traitId, taxonId, entryType);
    }
}

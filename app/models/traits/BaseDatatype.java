package models.traits;

import com.google.common.base.Objects;
import io.ebean.Model;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Transient;
import models.Taxon;
import models.traitsExport.TraitDetailsEntryType;
import repositories.TaxonRepository;

@MappedSuperclass
public class BaseDatatype extends Model {
    @Column(name = "trait_id")
    private long traitId;

    @Column(name = "taxon_id")
    private long taxonId;

    @Column(name = "entry_type")
    private int entryType = TraitDetailsEntryType.Original.getIndex();

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
        if (o == null)
            return false;

        if (!this.getClass().isAssignableFrom(o.getClass())) {
            return false;
        }

        BaseDatatype other = (BaseDatatype) o;

        return (traitId == other.traitId &&
            taxonId == other.taxonId &&
            entryType == other.entryType);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(traitId, taxonId, entryType);
    }
}

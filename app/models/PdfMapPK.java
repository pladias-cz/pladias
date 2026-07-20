package models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class PdfMapPK {


    @Column(name = "taxon_id")
    private long taxonId;
    @Column(name = "filetype")
    private int filetype; //1 = png, 2 = pdf

    public PdfMapPK() {
    }


    public PdfMapPK(long taxonId, int filetype) {
        this.taxonId = taxonId;
        this.filetype = filetype;
    }

    public long getTaxonId() {
        return taxonId;
    }

    public void setTaxonId(long taxonId) {
        this.taxonId = taxonId;
    }

    public int getFiletype() {
        return filetype;
    }

    public void setFiletype(int type) {
        this.filetype = type;
    }

    @Override
    public int hashCode() {
        return (int) (17 * filetype + taxonId * 27);
    }

    @Override
    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (!(o instanceof PdfMapPK other)) {
            return false;
        }

        return (taxonId == other.taxonId && filetype == other.filetype);
    }
}

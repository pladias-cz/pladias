package models.traits;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import models.Syntaxon;

@Embeddable
public class SyntaxonDatatypePK extends DatatypePK {
    @Column(name = "syntaxon_id")
    private int syntaxonId;

    public int getSyntaxonId() {
        return syntaxonId;
    }

    public void setSyntaxonId(int syntaxonId) {
        this.syntaxonId = syntaxonId;
    }

    public Syntaxon getSyntaxon() {
        return Syntaxon.find().byId(syntaxonId);
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof SyntaxonDatatypePK other)) {
            return false;
        }

        return (getTraitId() == other.getTraitId() &&
            getTaxonId() == other.getTaxonId() &&
            syntaxonId == other.syntaxonId);
    }

    @Override
    public int hashCode() {
        return ((int) getTraitId() * 17 + (int) getTaxonId() * 31 + syntaxonId * 37);
    }
}

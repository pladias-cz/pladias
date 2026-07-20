package models;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.*;

@Entity
@Table(name = TaxonSynonym.QualifiedName)
@SuppressWarnings("serial")
public class TaxonSynonym extends Model {
    public static final String QualifiedName = "public.taxons_synonyms";

    @Id
    @Column(name = "id")
    private long id;


    @ManyToOne
    @Column(name = "taxon_id", nullable = false)
    @JoinColumn(name = "taxon_id", referencedColumnName = "id")
    private Taxon taxon;

    @Column(name = "name_lat")
    private String nameLat;


    @Column(name = "name_html")
    private String nameHtml;


    private String suffix;

    @Column(name = "autocomplete")
    private boolean isAutocomplete;

    @ManyToOne
    @Column(nullable = true, name = "publication_id")
    @JoinColumn(name = "publication_id", referencedColumnName = "id")
    private Publication publication;

    public static final Finder<Long, TaxonSynonym> find() {
        return new Finder<>(TaxonSynonym.class);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Taxon getTaxon() {
        return taxon;
    }

    public void setTaxon(Taxon taxon) {
        this.taxon = taxon;
    }

    public String getNameLat() {
        return nameLat;
    }

    public void setNameLat(String nameLat) {
        this.nameLat = nameLat;
    }

    public String getNameHtml() {
        return nameHtml;
    }

    public void setNameHtml(String nameHtml) {
        this.nameHtml = nameHtml;
    }

    public String getSuffix() {
        return suffix;
    }

    public void setSuffix(String suffix) {
        this.suffix = suffix;
    }

    public boolean isAutocomplete() {
        return isAutocomplete;
    }

    public void setAutocomplete(boolean isAutocomplete) {
        this.isAutocomplete = isAutocomplete;
    }

    public Publication getPublication() {
        return publication;
    }

    public void setPublication(Publication publication) {
        this.publication = publication;
    }
}

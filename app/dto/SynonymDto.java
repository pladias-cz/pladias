package dto;

public class SynonymDto {
    private Long id;

    private Long taxonId;

    private String name;

    private String nameHtml;

    private String suffix;

    private boolean autocomplete;

    private int publication;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTaxonId() {
        return taxonId;
    }

    public void setTaxonId(Long taxonId) {
        this.taxonId = taxonId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public boolean getAutocomplete() {
        return autocomplete;
    }

    public void setAutocomplete(Boolean autocomplete) {
        this.autocomplete = autocomplete;
    }

    public Integer getPublication() {
        return publication;
    }

    public void setPublication(int publicationId) {
        this.publication = publicationId;
    }
}
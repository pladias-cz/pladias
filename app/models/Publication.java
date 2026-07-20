package models;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.List;

@Entity
@Table(name = Publication.QualifiedTableName)
@SuppressWarnings("serial")
public class Publication extends Model {
    public static final String QualifiedTableName = "public.publications";

    private static final int EMPTY_PUBLICATION_ID = 1;

    @Id
    private long id;

    private String abbrev;

    private String title;

    private String authors;

    private String publisher;

    private Integer year;

    private Boolean autocomplete;

    public static final Finder<Integer, Publication> find() {
        return new Finder<>(Publication.class);
    }

    public static Publication getEmpty() {
        return find().byId(EMPTY_PUBLICATION_ID);
    }

    public static List<Publication> getAll() {
        return Publication.find().query().orderBy("id").findList();
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getAbbrev() {
        return abbrev;
    }

    public void setAbbrev(String abbrev) {
        this.abbrev = abbrev;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthors() {
        return authors;
    }

    public void setAuthors(String authors) {
        this.authors = authors;
    }

    public String getPublisher() {
        return publisher;
    }

    public void setPublisher(String publisher) {
        this.publisher = publisher;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Boolean isAutocomplete() {
        return autocomplete;
    }

    public void setAutocomplete(Boolean autocomplete) {
        this.autocomplete = autocomplete;
    }
}

package models;

import io.ebean.*;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@SuppressWarnings("serial")
@Table(name = RevisionStatus.QualifiedTableName)
public class RevisionStatus extends Model {
    public static final String QualifiedTableName = "atlas.taxon_mapsettings_revision";

    public static final int StatusNotStarted = 0;
    public static final int StatusAssigned = 1;
    public static final int StatusMapInProgress = 2; //at least 20 records has been touched
    public static final int StatusMapSubmitted = 3;
    public static final int StatusReview = 4;
    public static final int StatusCompleting = 5;
    public static final int StatusClosed = 6;


    @Id
    private int id;

    private String description;

    public static final Finder<Integer, RevisionStatus> find() {
        return new Finder<>(RevisionStatus.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return String.format("%d-%s", id, description);
    }
}

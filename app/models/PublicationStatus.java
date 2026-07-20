package models;

import io.ebean.*;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@SuppressWarnings("serial")
@Table(name = PublicationStatus.QualifiedTableName)
public class PublicationStatus extends Model {
    public static final String QualifiedTableName = "atlas.taxon_mapsettings_publication";

    public static final int StatusNotStarted = 0;
    public static final int ApprovedForProcessing = 1;
    public static final int StatusPreviewPreparation = 2;
    public static final int StatusPreview = 3;
    public static final int StatusDone = 4;


    @Id
    private int id;

    private String description;

    public static final Finder<Integer, PublicationStatus> find() {
        return new Finder<>(PublicationStatus.class);
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
}

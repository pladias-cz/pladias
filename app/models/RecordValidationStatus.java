package models;

import io.ebean.*;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = RecordValidationStatus.QualifiedTableName)
@SuppressWarnings("serial")
public class RecordValidationStatus extends Model {

    public static final String QualifiedTableName = "atlas.record_validation_status";

    public static final int Unprocessed = 0;
    public static final int Uncertain = 1;
    public static final int Declined = 2;
    public static final int Accepted = 3;


    @Id
    private int id;

    private String description;

    private String color;


    private int priority;

    public static final Finder<Integer, RecordValidationStatus> find() {
        return new Finder<>(RecordValidationStatus.class);
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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public void save() {
        throw new UnsupportedOperationException("Entity record_validation_status is read-only.");
    }
}

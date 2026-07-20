package models;

import io.ebean.*;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = License.QualifiedTableName)
public class License extends Model {
    public static final String QualifiedTableName = "public.licenses";
    @Id
    private int id;
    private String key;
    private String description;

    public static final Finder<Integer, License> find() {
        return new Finder<>(License.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

}

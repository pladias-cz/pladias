package models;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = RecordOriginalityStatus.QualifiedTableName)
@SuppressWarnings("serial")
public class RecordOriginalityStatus extends Model {

    public static final String QualifiedTableName = "atlas.record_originality_status";
    public static final int Original = 1;
    public static final int Cultivated = 2;
    public static final int Unoriginal = 3;
    public static final int Undefined = 4;
    @Id
    private int id;
    @Column(name = "name_cz")
    private String name;
    private String icon;
    private int priority;

    public static Finder<Integer, RecordOriginalityStatus> find() {
        return new io.ebean.Finder<Integer, RecordOriginalityStatus>(RecordOriginalityStatus.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    @Override
    public void save() {
        throw new UnsupportedOperationException("Entity 'record original status' is read-only.");
    }

    @Override
    public void update() {
        throw new UnsupportedOperationException("Entity 'record original status' is read-only.");
    }
}

package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = InheritanceType.QualifiedName)
@SuppressWarnings("serial")
public class InheritanceType extends Model {
    public static final String QualifiedName = "measurements.inheritances";
    public final static int Disabled = 1;
    public final static int EnumAdditive = 2;
    public final static int EnumStandard = 3;
    public final static int EnumSingle = 4;
    public final static int Bool = 5;
    public final static int IntervalDeep = 6;
    public final static int Month = 7;
    public final static int Excluded = 8;
    public final static int Basic = 9;
    public final static int Numeric = 10;
    public final static int IntervalShallow = 11;
    public final static int EnumSyntaxon = 12;
    public final static int Distribution = 13;
    @Id
    private int id;
    @Column(name = "key", nullable = false)
    private String key;
    @Column(name = "name", nullable = false)
    private String name;
    @Column(name = "description", nullable = true)
    private String description;

    public static final Finder<Integer, InheritanceType> find() {
        return new Finder<>(InheritanceType.class);
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}

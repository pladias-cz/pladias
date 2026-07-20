package models;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = Maintenance.QualifiedTableName)
@SuppressWarnings("serial")
public class Maintenance extends Model {
    public static final String QualifiedTableName = "public.maintenance";

    @Id
    private Integer id;

    @Column(name = "message")
    private String text;

    @Column(name = "type")
    private String type;

    public static final Finder<Integer, Maintenance> find() {
        return new Finder<>(Maintenance.class);
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}

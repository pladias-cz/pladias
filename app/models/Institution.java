package models;

import io.ebean.*;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = Institution.QualifiedTableName)
@SuppressWarnings("serial")
public class Institution extends Model {

    public static final String QualifiedTableName = "public.institutions";

    @Id
    private String id;

    private String name;

    @OneToMany(cascade = CascadeType.PERSIST)
    private List<Project> projects;

    @ManyToMany
    private List<User> managers;

    @Column(name = "name_eng")
    private String nameEng;

    public static final Finder<Integer, Institution> find() {
        return new Finder<>(Institution.class);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Project> getProjects() {
        return projects;
    }

    public void setProjects(List<Project> projects) {
        this.projects = projects;
    }

    public List<User> getManagers() {
        return managers;
    }

    public void setManagers(List<User> managers) {
        this.managers = managers;
    }

    public String getNameEng() {
        return nameEng;
    }

    public void setNameEng(String nameEng) {
        this.nameEng = nameEng;
    }

    @Override
    public void save() {
        //not intended for modification
        throw new UnsupportedOperationException();
    }

    @Override
    public void update() {
        //not intended for modification
        throw new UnsupportedOperationException();
    }
}

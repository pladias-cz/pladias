package models;

import io.ebean.*;
import jakarta.persistence.*;

@Entity
@Table(name = Project.QualifiedTableName)
@SuppressWarnings("serial")
public class Project extends Model {
    public static final int AtlasExcerptionProjectId = 14;
    public static final int PlantsVysocinaDatabaseProjectId = 16;
    public static final int NDOPProjectId = 9;

    public static final String QualifiedTableName = "atlas.projects";

    @Id
    private long id;

    private String name;

    private String abbrev;

    private int credibility;

    @Column(name = "name_eng")
    private String nameEng;

    @ManyToOne
    @JoinColumn(name = "institution_id", referencedColumnName = "id")
    private Institution institution;

    public static final Finder<Integer, Project> find() {
        return new Finder<>(Project.class);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAbbrev() {
        return abbrev;
    }

    public void setAbbrev(String abbrev) {
        this.abbrev = abbrev;
    }

    public Institution getInstitution() {
        return institution;
    }

    public void setInstitution(Institution institution) {
        this.institution = institution;
    }

    public int getCredibility() {
        return credibility;
    }

    public void setCredibility(int credibility) {
        this.credibility = credibility;
    }

    public String getNameEng() {
        return nameEng;
    }

    public void setNameEng(String nameEng) {
        this.nameEng = nameEng;
    }

    public boolean isManagedByUser(User user) {
        String sql = "SELECT 1 FROM  atlas.projects_users WHERE user_id = :userId AND project_id = :projectId AND projectadmin = TRUE";
        SqlRow row = DB.sqlQuery(sql)
            .setParameter("userId", user.getId())
            .setParameter("projectId", id).
            findOne();

        return (row != null);
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

    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (!(o instanceof Project other))
            return false;

        return (id == other.id);
    }

    public int hashCode() {
        return (int) (37 * id);
    }

    public String toString() {
        return String.format("[%s]", name);
    }
}

package models;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.*;
import models.traits.Feature;
import org.apache.commons.lang3.StringUtils;
import platform.ProjectConstants;
import play.Logger;
import play.data.validation.Constraints.Email;
import play.i18n.Lang;
import play.mvc.Http.Session;
import service.password.IHashService;
import utils.SessionUtils;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import java.io.UnsupportedEncodingException;
import java.util.*;

@Entity
@Table(name = User.QualifiedName)
@SuppressWarnings("serial")
public class User extends Model {
    public static final String QualifiedName = "public.users";

    public static final int MinPasswordLength = 6;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "public.users_id_seq")
    private long id;

    @Email
    private String email;

    @Column(name = "password")
    private String encryptedPassword;

    private String name;

    private String surname;

    private String description;

    @Column(name = "mapadmin")
    private boolean mapAdmin;

    @Column(name = "traitadmin")
    private boolean traitAdmin;

    @Column(name = "biblioadmin")
    private boolean biblioAdmin;

    @Column(name = "sysadmin")
    private boolean sysAdmin;

    @Column(name = "taxonadmin")
    private boolean taxonAdmin;

    @Column(name = "analyst")
    private boolean analyst;

    @Column(name = "deleted")
    private boolean deleted;

    @ManyToOne
    @JoinColumn(name = "last_taxon_id", referencedColumnName = "id")
    private Taxon lastTaxon;

    @Column(name = "hashed_password", columnDefinition = "text")
    private String hashedPassword;

    @Column(name = "auth_token", columnDefinition = "text")
    private String authToken;

    @ManyToMany(mappedBy = "supervisors")
    @JoinTable(name = "atlas.taxons_users")
    private Set<Taxon> supervisedTaxons = new HashSet<>();

    @ManyToMany
    @JoinTable(
        name = "atlas.projects_users",
        joinColumns = {@JoinColumn(name = "user_id", referencedColumnName = "id")},
        inverseJoinColumns = {@JoinColumn(name = "project_id", referencedColumnName = "id")}
    )
    private Set<Project> contributionProjects;

    @ManyToMany(cascade = CascadeType.PERSIST)
    @JoinTable(name = "atlas.users_comments")
    private List<RecordComment> recordComments = new ArrayList<>();

    @Transient
    private List<Feature> supervisedFeatures;

    public static Finder<Long, User> find() {
        return new Finder<>(User.class);
    }

    public static User getCurrent(Session session) {
        return SessionUtils.getCurrentUser(session);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean verifyPassword(String userSubmittedPassword, IHashService service) {
        return service.verifyPassword(hashedPassword, userSubmittedPassword);
    }

    public void setPlainPassword(String plainPassword, IHashService service) throws UnsupportedEncodingException, IllegalBlockSizeException, BadPaddingException {
        hashedPassword = service.hashPassword(plainPassword);
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSurname() {
        return surname;
    }

    public void setSurname(String surname) {
        this.surname = surname;
    }

    public String getFullname() {
        return name + " " + surname;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Set<Taxon> getSupervisedTaxons() {
        return supervisedTaxons;
    }

    public void setSupervisedTaxons(Set<Taxon> supervisedTaxons) {
        this.supervisedTaxons = supervisedTaxons;
    }

    public List<Taxon> getSupervisedTaxonsSorted() {
        List<Taxon> list = new ArrayList<>(supervisedTaxons);
        list.sort((t1, t2) -> t1.getNameLat().compareTo(t2.getNameLat()));
        return list;
    }

    public List<RecordComment> getRecordComments() {
        return recordComments;
    }

    public void setRecordComments(List<RecordComment> recordComments) {
        this.recordComments = recordComments;
    }

    public Taxon getLastTaxon() {
        return lastTaxon;
    }

    public void setLastTaxon(Taxon taxon) {
        this.lastTaxon = taxon;
    }

    public boolean isMapAdmin() {
        return mapAdmin;
    }

    public void setMapAdmin(boolean admin) {
        this.mapAdmin = admin;
    }

    public boolean isTraitAdmin() {
        return traitAdmin;
    }

    public void setTraitAdmin(boolean traitAdmin) {
        this.traitAdmin = traitAdmin;
    }

    public boolean isSysAdmin() {
        return sysAdmin;
    }

    public void setSysAdmin(boolean sysAdmin) {
        this.sysAdmin = sysAdmin;
    }

    public boolean isBiblioAdmin() {
        return biblioAdmin;
    }

    public void setBiblioAdmin(boolean biblioAdmin) {
        this.biblioAdmin = biblioAdmin;
    }

    public boolean isTaxonAdmin() {
        return taxonAdmin;
    }

    public void setTaxonAdmin(boolean taxonAdmin) {
        this.taxonAdmin = taxonAdmin;
    }

    public boolean isAnalyst() {
        return analyst;
    }

    public void setAnalyst(boolean analyst) {
        this.analyst = analyst;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public Set<Project> getContributionProjects() {
        return contributionProjects;
    }

    public void setContributionProjects(Set<Project> contributionProjects) {
        this.contributionProjects = contributionProjects;
    }

    public String getHashedPassword() {
        return hashedPassword;
    }

    public void setHashedPassword(String hashedPassword) {
        this.hashedPassword = hashedPassword;
    }

    public String getAuthToken() {
        return authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;
    }

    /**
     *
     * @return Returns true if the user is a mapAdmin or supervises specified taxon.
     */

    public boolean supervises(Taxon taxon) {
        if (isMapAdmin())
            return true;

        return supervisedTaxons.contains(taxon);
    }

    public boolean canContributeInto(Project project) {
        if (project == null)
            throw new IllegalArgumentException("project");

        if (contributionProjects == null)
            return false;

        for (Project p : contributionProjects) {
            if (project.equals(p)) {
                return true;
            }
        }
        return false;
    }

    public List<Feature> getSupervisedFeatures() {
        if (supervisedFeatures == null) {
            supervisedFeatures = Feature.find().query().where().eq("admin.id", id).findList();
        }
        return supervisedFeatures;
    }

    public boolean supervises(Feature f) {
        if (isTraitAdmin())
            return true;

        return getSupervisedFeatures().contains(f);
    }

    public boolean getSettingsBoolean(String key, boolean defaultValue) {
        UserSettings settings = UserSettings.find().query().where()
            .eq("settings.userId", id)
            .eq("settings.key", key).findOne();

        if (settings == null) {
            return defaultValue;
        }

        try {
            return Boolean.parseBoolean(settings.getValue());
        } catch (Exception e) {
            Logger.error(String.format("Error while reading UserSettings key=%s for user=%d", key, id));
            return defaultValue;
        }
    }

    public Lang getLanguage() {
        return Lang.forCode(ProjectConstants.DefaultLang);
    }

    public String getSettingsString(String key, String defaultValue) {
        UserSettings settings = UserSettings.find().query().where()
            .eq("settings.userId", id)
            .eq("settings.key", key).findOne();

        if (settings == null) {
            return defaultValue;
        }
        return settings.getValue();
    }

    @Override
    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (!(o instanceof User other))
            return false;

        return (id == other.id &&
            StringUtils.equals(email, other.email) &&
            StringUtils.equals(name, other.name) &&
            StringUtils.equals(surname, other.surname));
    }

    @Override
    public int hashCode() {
        if (email != null) return email.hashCode();
        return super.hashCode();
    }
}

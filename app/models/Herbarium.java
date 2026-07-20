package models;

import io.ebean.*;
import jakarta.persistence.*;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

@Entity
@Table(name = Herbarium.QualifiedTableName)
@SuppressWarnings("serial")
public class Herbarium extends Model {

    public static final String QualifiedTableName = "atlas.herbariums";

    public static final int NonHerbariumId = -1;
    public static final int AnyHerbariumId = -2;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.herbariums_id_seq")
    private int id;

    @ManyToOne
    @JoinColumn(name = "owner", referencedColumnName = "id")
    private User owner;

    private String abbrev;

    private String name;

    @Column(name = "abbrev_explanation")
    private String abbrevExplanation;

    @Column(name = "name_sort")
    private String nameSort;

    private boolean validated = true;

    @Column(name = "import_id")
    private String importId;

    public static final Finder<Integer, Herbarium> find() {
        return new Finder<>(Herbarium.class);
    }

    public static Herbarium findByImportId(String importId) {
        List<Herbarium> herbList = find().query().where().ieq("import_id", importId).findList();
        if (herbList.size() == 0)
            return null;
        return herbList.get(0);

    }

    public static Herbarium findByAbbrev(String abbrev) {
        List<Herbarium> herbList = find().query().where().eq("abbrev", abbrev).findList();
        if (herbList.size() == 0)
            return null;
        return herbList.get(0);
    }

    public static boolean isValidHerbId(int herbariumId) {
        return herbariumId > 0;
    }

    public static boolean isNonHerbariumId(int herbariumId) {
        return herbariumId == NonHerbariumId;
    }

    public static boolean isAnyHerbariumId(int herbariumId) {
        return herbariumId == AnyHerbariumId;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public String getAbbrev() {
        return abbrev;
    }

    public void setAbbrev(String abbrev) {
        this.abbrev = abbrev;
    }

    public String getAbbrevExplanation() {
        return abbrevExplanation;
    }

    public void setAbbrevExplanation(String abbrevExplanation) {
        this.abbrevExplanation = abbrevExplanation;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNameSort() {
        return nameSort;
    }

    public boolean isValidated() {
        return validated;
    }

    public void setValidated(boolean value) {
        this.validated = value;
    }

    public String getImportId() {
        return importId;
    }

    public void setImportId(String importId) {
        this.importId = importId;
    }

    public boolean equals(Object other) {
        if (!(other instanceof Herbarium h))
            return false;

        return (this.id == h.id &&
            StringUtils.equals(name, h.name) &&
            StringUtils.equals(abbrev, h.abbrev));
    }

    public int hashCode() {
        return 3 * id
            + 7 * StringUtils.defaultIfBlank(name, "").hashCode()
            + 11 * StringUtils.defaultIfBlank(abbrev, "").hashCode();
    }
}

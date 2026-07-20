package models.nonvascular;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.apache.commons.lang3.StringUtils;

import java.util.List;
import java.util.Optional;

@Entity
@Table(name = Substrate1.QualifiedTableName)
@SuppressWarnings("serial")
public class Substrate1 extends Model {
    public static final String QualifiedTableName = "atlas_nonvascular.substrate_1";
    @Id
    private Integer id;
    @Column(name = "key_cz")
    private String keyCz;

    public static Finder<Integer, Substrate1> find() {
        return new Finder<>(Substrate1.class);
    }

    public static List<Substrate1> all() {
        return find().query().orderBy("succession").findList();
    }

    public static Optional<Substrate1> FindByKeyCz(String keyCz) {
        String trimmedKey = StringUtils.trimToEmpty(keyCz);
        return find().query().where().eq("keyCz", trimmedKey).findOneOrEmpty();
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getKeyCz() {
        return keyCz;
    }

    public void setKeyCz(String keyCz) {
        this.keyCz = keyCz;
    }

}

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
@Table(name = Substrate2.QualifiedTableName)
@SuppressWarnings("serial")
public class Substrate2 extends Model {
    public static final String QualifiedTableName = "atlas_nonvascular.substrate_2";
    @Id
    private Integer id;
    @Column(name = "substrate_1_id")
    private Integer substrate1Id;
    @Column(name = "key_cz")
    private String keyCz;

    public static Finder<Long, Substrate2> find() {
        return new Finder<>(Substrate2.class);
    }

    public static List<Substrate2> all() {
        return find().query().orderBy("succession").findList();
    }

    public static Optional<Substrate2> FindByKeyCzAndSubstrate1(String keyCz, Substrate1 substrate1) {
        String trimmedKey = StringUtils.trimToEmpty(keyCz);
        return find().query().where().eq("keyCz", trimmedKey).eq("substrate1Id", substrate1.getId()).findOneOrEmpty();
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getSubstrate1Id() {
        return substrate1Id;
    }

    public void setSubstrate1Id(Integer substrate1Id) {
        this.substrate1Id = substrate1Id;
    }

    public String getKeyCz() {
        return keyCz;
    }

    public void setKeyCz(String keyCz) {
        this.keyCz = keyCz;
    }

    public Substrate1 getSubstrate1() {
        return Substrate1.find().byId(substrate1Id);
    }
}

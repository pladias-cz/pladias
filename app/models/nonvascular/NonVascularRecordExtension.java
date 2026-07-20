package models.nonvascular;

import io.ebean.*;
import jakarta.persistence.*;

@Entity
@Table(name = NonVascularRecordExtension.QualifiedTableName)
@SuppressWarnings("serial")
public class NonVascularRecordExtension extends Model {
    public static final String QualifiedTableName = "atlas_nonvascular.records_extension";

    @Id
    @Column(name = "record_id")
    private long recordId;

    private String substrate;

    private String chemical;

    @Column(name = "locality_extra")
    private String localityExtra;

    @ManyToOne
    @JoinColumn(name = "substrate_1_id", referencedColumnName = "id", nullable = true)
    private Substrate1 substrate1;

    @ManyToOne
    @JoinColumn(name = "substrate_2_id", referencedColumnName = "id", nullable = true)
    private Substrate2 substrate2;

    public static Finder<Long, NonVascularRecordExtension> find() {
        return new Finder<>(NonVascularRecordExtension.class);
    }

    public long getRecordId() {
        return recordId;
    }

    public void setRecordId(long recordId) {
        this.recordId = recordId;
    }

    public String getSubstrate() {
        return substrate;
    }

    public void setSubstrate(String substrate) {
        this.substrate = substrate;
    }

    public String getChemical() {
        return chemical;
    }

    public void setChemical(String chemical) {
        this.chemical = chemical;
    }

    public Substrate1 getSubstrate1() {
        return substrate1;
    }

    public void setSubstrate1(Substrate1 substrate1) {
        this.substrate1 = substrate1;
    }

    public Substrate2 getSubstrate2() {
        return substrate2;
    }

    public void setSubstrate2(Substrate2 substrate2) {
        this.substrate2 = substrate2;
    }

    public String getLocalityExtra() {
        return localityExtra;
    }

    public void setLocalityExtra(String localityExtra) {
        this.localityExtra = localityExtra;
    }

    public String getSubstrateCategoryText() {
        Substrate1 substrate1 = getSubstrate1();
        Substrate2 substrate2 = getSubstrate2();
        if (substrate1 == null) {
            return "";
        }
        if (substrate2 == null) {
            return substrate1.getKeyCz();
        }
        return substrate1.getKeyCz() + " - " + substrate2.getKeyCz();
    }

}

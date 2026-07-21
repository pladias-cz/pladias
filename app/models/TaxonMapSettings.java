package models;

import cache.TaxonCache;
import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import jakarta.persistence.Version;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Entity
@SuppressWarnings("serial")
@Table(name = TaxonMapSettings.QualifiedTableName)
public class TaxonMapSettings extends Model {
    public static final String QualifiedTableName = "atlas.taxon_mapsettings";

    @Id
    @Column(name = "taxon_id")
    private Long id;

    @OneToOne
    @PrimaryKeyJoinColumn
    private Taxon taxon;

    @Column(name = "map_type")
    private int mapType;

    @OneToOne
    @Column(name = "revision_status")
    @JoinColumn(name = "revision_status", referencedColumnName = "id")
    private RevisionStatus revisionStatus;

    @OneToOne
    @Column(name = "publication_status")
    @JoinColumn(name = "publication_status", referencedColumnName = "id")
    private PublicationStatus publicationStatus;

    @Column(name = "revisors_comment")
    private String revisorsComment;

    @Column(name = "revisors_print_map_comment")
    private String revisorsPrintMapComment;

    @Column(name = "mapadmin_comment")
    private String mapAdminComment;

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "edit_timestamp")
    private Timestamp lastEditTimestamp;

    @Column(name = "is_mapped")
    private boolean isMapped;

    @Column(name = "common_threshold")
    private int commonThreshold;

    @Column(name = "is_protected")
    private boolean isProtected;

    @Column(name = "edit_count")
    private int editCount;

    private boolean locked;

    @ManyToOne
    @JoinColumn(name = "superior_taxon", referencedColumnName = "taxon_id")
    @Column(name = "superior_taxon", nullable = true)
    private TaxonMapSettings parent;

    @Column(name = "preslia", nullable = true)
    private String preslia;

    public static final Finder<Long, TaxonMapSettings> find() {
        return new Finder<>(TaxonMapSettings.class);
    }

    public static List<Integer> getPossibleCommonThresholdValues() {
        List<Integer> allowed = new ArrayList<>();
        allowed.add(0);
        allowed.add(1);
        allowed.add(2);
        allowed.add(3);
        return allowed;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Taxon getTaxon() {
        return taxon;
    }

    public void setTaxon(Taxon taxon) {
        this.taxon = taxon;
    }

    public int getMapType() {
        return mapType;
    }

    public void setMapType(int mapType) {
        this.mapType = mapType;
    }

    public RevisionStatus getRevisionStatus() {
        return revisionStatus;
    }

    public void setRevisionStatus(RevisionStatus revisionStatus) {
        this.revisionStatus = revisionStatus;
    }

    public PublicationStatus getPublicationStatus() {
        return publicationStatus;
    }

    public void setPublicationStatus(PublicationStatus publicationStatus) {
        this.publicationStatus = publicationStatus;
    }

    public String getRevisorsComment() {
        return revisorsComment;
    }

    public void setRevisorsComment(String revisorsComment) {
        this.revisorsComment = revisorsComment;
    }

    public String getRevisorsPrintMapComment() {
        return revisorsPrintMapComment;
    }

    public void setRevisorsPrintMapComment(String revisorsPrintMapComment) {
        this.revisorsPrintMapComment = revisorsPrintMapComment;
    }

    public String getMapAdminComment() {
        return mapAdminComment;
    }

    public void setMapAdminComment(String mapAdminComment) {
        this.mapAdminComment = mapAdminComment;
    }

    public Timestamp getLastEditTimestamp() {
        return lastEditTimestamp;
    }

    public void setLastEditTimestamp(Timestamp lastEditTimestamp) {
        this.lastEditTimestamp = lastEditTimestamp;
    }

    public boolean isMapped() {
        return isMapped;
    }

    public void setMapped(boolean isMapped) {
        this.isMapped = isMapped;
    }

    public int getEditCount() {
        return editCount;
    }

    public void setEditCount(int editCount) {
        this.editCount = editCount;
    }

    public int incrementEditCount() {
        return ++editCount;
    }

    public boolean isCommon() {
        return commonThreshold > 0;
    }

    public Integer getCommonThreshold() {
        return commonThreshold;
    }

    public void setCommonThreshold(Integer commonThreshold) {
        this.commonThreshold = commonThreshold;
    }

    public TaxonMapSettings getParent() {
        return parent;
    }

    public void setParent(TaxonMapSettings parent) {
        this.parent = parent;
    }


    public boolean isLocked() {
        return locked;
    }

    public void setLocked(boolean locked) {
        this.locked = locked;
    }

    public String getPreslia() {
        return preslia;
    }

    public void setPreslia(String preslia) {
        this.preslia = preslia;
    }

    public boolean isAggregateRoot() {
        if (parent == null)
            return false;

        return (id.equals(parent.getId()));
    }

    public boolean isProtected() {
        return isProtected;
    }

    public void setProtected(boolean isProtected) {
        this.isProtected = isProtected;
    }

    public List<TaxonMapSettings> getAggregatedChildren() {
        if (!isAggregateRoot())
            return new ArrayList<>();

        return TaxonMapSettings.find().query().where()
            .eq("parent.id", id) //this taxon is their parent
            .ne("id", id)        //exclude this taxon
            .findList();
    }

    @Override
    public void save() {
        super.save();
        TaxonCache.getInstance().update(this);
    }

    @Override
    public void update() {
        super.update();
        TaxonCache.getInstance().update(this);
    }
}

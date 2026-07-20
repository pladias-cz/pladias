package models.traits;

import io.ebean.Finder;
import io.ebean.Model;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;
import models.User;

import java.sql.Timestamp;

@SuppressWarnings("serial")
@Table(name = Trait.QualifiedName)
@Entity
public class Trait extends Model {
    public static final String QualifiedName = "measurements.traits";
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "measurements.traits_id_seq")
    private int id;
    @Column(nullable = false)
    private String source;

    @ManyToOne
    @Column(nullable = false)
    @JoinColumn(name = "owner", referencedColumnName = "id")
    private User owner;

    @ManyToOne
    @Column(nullable = false)
    @JoinColumn(name = "feature_id", referencedColumnName = "id")
    private Feature feature;

    @Column(name = "description_cs")
    private String descriptionCz;

    @Column(name = "description_en")
    private String descriptionEn;

    @Lob
    @Column(name = "attachment")
    private byte[] attachment;

    @Column(name = "attachment_type")
    private String attachmentType;

    @Column(name = "deleted")
    private boolean deleted;

    @Column(name = "default_values")
    private boolean defaultValue;

    @WhenCreated
    @Column(name = "creation_timestamp")
    private Timestamp createTimestamp;

    @ManyToOne
    @Column(name = "visibility_status_id")
    @JoinColumn(name = "visibility_status_id", referencedColumnName = "id")
    private VisibilityStatus visibilityStatus;

    @Column(name = "total_taxon_count")
    private int totalTaxonCount;


    public static final Finder<Integer, Trait> find() {
        return new Finder<>(Trait.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public Feature getFeature() {
        return feature;
    }

    public void setFeature(Feature feature) {
        this.feature = feature;
    }

    public String getDescriptionCz() {
        return descriptionCz;
    }

    public void setDescriptionCz(String descriptionCz) {
        this.descriptionCz = descriptionCz;
    }

    public String getDescriptionEn() {
        return descriptionEn;
    }

    public void setDescriptionEn(String descriptionEn) {
        this.descriptionEn = descriptionEn;
    }

    public byte[] getAttachment() {
        return attachment;
    }

    public void setAttachment(byte[] attachment) {
        this.attachment = attachment;
    }

    public String getAttachmentType() {
        return attachmentType;
    }

    public void setAttachmentType(String attachmentType) {
        this.attachmentType = attachmentType;
    }

    public VisibilityStatus getVisibilityStatus() {
        return visibilityStatus;
    }

    public void setVisibilityStatus(VisibilityStatus visibilityStatus) {
        this.visibilityStatus = visibilityStatus;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public boolean isDefault() {
        return defaultValue;
    }

    public void setDefault(boolean defaultValue) {
        this.defaultValue = defaultValue;
    }

    public Timestamp getCreateTimestamp() {
        return createTimestamp;
    }

    public void setCreateTimestamp(Timestamp createTimestamp) {
        this.createTimestamp = createTimestamp;
    }

    public boolean hasAttachment() {
        return (attachment != null && attachment.length > 0);
    }

    public int getTotalTaxonCount() {
        return totalTaxonCount;
    }

    public void setTotalTaxonCount(int totalTaxonCount) {
        this.totalTaxonCount = totalTaxonCount;
    }
}

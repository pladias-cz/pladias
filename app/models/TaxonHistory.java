package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;

import java.sql.Timestamp;

@Entity
@Table(name = TaxonHistory.QualifiedName)
@SuppressWarnings("serial")
public class TaxonHistory extends Model {
    public static final String QualifiedName = "public.taxons_history";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "public.taxons_history_id_seq")
    private long id;

    @ManyToOne
    @Column(nullable = false, name = "taxon_id")
    @JoinColumn(name = "taxon_id", referencedColumnName = "id")
    private Taxon taxon;

    @Column(name = "old_parent", nullable = true)
    private Long oldParent;

    @Column(name = "new_parent", nullable = true)
    private Long newParent;

    @Column(name = "operation_type", nullable = false)
    private String operationType;

    @Temporal(TemporalType.TIMESTAMP)
    @WhenCreated
    @Column(name = "create_timestamp", updatable = false)
    private Timestamp createTimestamp;

    public static final Finder<Integer, TaxonHistory> find() {
        return new Finder<>(TaxonHistory.class);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Taxon getTaxon() {
        return taxon;
    }

    public void setTaxon(Taxon taxon) {
        this.taxon = taxon;
    }

    public Long getOldParent() {
        return oldParent;
    }

    public void setOldParent(Long oldParent) {
        this.oldParent = oldParent;
    }

    public Long getNewParent() {
        return newParent;
    }

    public void setNewParent(Long newParent) {
        this.newParent = newParent;
    }

    public String getOperationType() {
        return operationType;
    }

    public void setOperationType(String operationType) {
        this.operationType = operationType;
    }

    public Timestamp getCreateTimestamp() {
        return createTimestamp;
    }

    public void setCreateTimestamp(Timestamp createTimestamp) {
        this.createTimestamp = createTimestamp;
    }
}

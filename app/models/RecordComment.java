package models;

import io.ebean.DB;
import io.ebean.Finder;
import io.ebean.Model;
import io.ebean.SqlRow;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;

import java.sql.Timestamp;
import java.util.List;

@SuppressWarnings("serial")
@Entity
@Table(name = RecordComment.QualifiedTableName)
public class RecordComment extends Model {

    public static final String QualifiedTableName = "atlas.comments";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.comments_id_seq")
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    @WhenCreated
    @Column(name = "creation_timestamp", updatable = false)
    private Timestamp createTimestamp;

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "edit_timestamp")
    private Timestamp lastEditTimestamp;

    @ManyToOne
    @JoinColumn(name = "author_id", referencedColumnName = "id")
    private User author;

    @ManyToOne
    @JoinColumn(name = "record_id", referencedColumnName = "id")
    private Record record;

    @Column(name = "record_id", insertable = false, updatable = false)
    private Long recordId;

    private boolean imported;

    private boolean deleted;

    private String message;

    private boolean resolved;

    @ManyToOne
    @JoinColumn(name = "solver_id", referencedColumnName = "id")
    private User resolvedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "resolved_timestamp")
    private Timestamp resolvedTimestamp;

    public static Finder<Long, RecordComment> find() {
        return new Finder<>(RecordComment.class);
    }

    public long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Timestamp getCreateTimestamp() {
        return createTimestamp;
    }

    public void setCreateTimestamp(Timestamp createTimestamp) {
        this.createTimestamp = createTimestamp;
    }

    public Timestamp getLastEditTimestamp() {
        return lastEditTimestamp;
    }

    public void setLastEditTimestamp(Timestamp lastEditTimestamp) {
        this.lastEditTimestamp = lastEditTimestamp;
    }

    public User getAuthor() {
        return author;
    }

    public void setAuthor(User author) {
        this.author = author;
    }

    public Record getRecord() {
        return record;
    }

    public void setRecord(Record record) {
        this.record = record;
        this.recordId = record != null ? record.getId() : null;
    }

    public Long getRecordId() {
        return recordId;
    }

    public void setRecordId(Long recordId) {
        this.recordId = recordId;
    }

    public boolean isImported() {
        return imported;
    }

    public void setImported(boolean imported) {
        this.imported = imported;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = (message);
    }

    public boolean isResolved() {
        return resolved;
    }

    public void setResolved(boolean resolved) {
        this.resolved = resolved;
    }

    public User getResolvedBy() {
        return resolvedBy;
    }

    public void setResolvedBy(User resolvedBy) {
        this.resolvedBy = resolvedBy;
    }

    public Timestamp getResolvedTimestamp() {
        return resolvedTimestamp;
    }

    public void setResolvedTimestamp(Timestamp resolvedTimestamp) {
        this.resolvedTimestamp = resolvedTimestamp;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null)
            return false;

        if (!(o instanceof RecordComment other))
            return false;

        return id.equals(other.id);
    }

    public boolean isLinkedForUser(long userId) {
        String query = "SELECT 1 from atlas.users_comments WHERE users_id=:user_id AND comments_id=:comment_id";

        List<SqlRow> rows = DB.sqlQuery(query)
            .setParameter("user_id", userId)
            .setParameter("comment_id", id)
            .findList();
        boolean isLinked = !rows.isEmpty();
        return isLinked;
    }

    @Override
    public int hashCode() {
        return 661 * (int) (id != null ? id : 1);
    }


}

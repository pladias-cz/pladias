package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;
import utils.SqlUtils;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = RecordHistory.QualifiedTableName)
@SuppressWarnings("serial")
public class RecordHistory extends Model {

    public static final String QualifiedTableName = "atlas.records_history";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.records_history_id_seq")
    private long id;

    @Column(nullable = false, name = "record_id")
    private long recordId;

    @ManyToOne
    @Column(nullable = false, name = "user_id")
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Column(nullable = false, name = "change_type")
    private RecordChangeType changeType;

    @Column(nullable = false, name = "field_desc")
    private String fieldDesc;

    @Column(nullable = false, name = "old_value")
    private String oldValue = "";

    @Column(nullable = false, name = "new_value")
    private String newValue = "";

    @Temporal(TemporalType.TIMESTAMP)
    @WhenCreated
    @Column(name = "creation_timestamp", updatable = false)
    private Timestamp createTimestamp;

    @Column(nullable = true, name = "comment_id")
    private Long commentId;

    public static Finder<Integer, RecordHistory> find() {
        return new Finder<>(RecordHistory.class);
    }

    public static List<String> getDistinctFieldDescriptors() {
        String sql = String.format("SELECT distinct field_desc FROM %s ORDER BY field_desc ASC;", QualifiedTableName);

        SqlQuery query = DB.sqlQuery(sql);
        List<SqlRow> list = query.findList();

        List<String> fields = new ArrayList<>();
        for (SqlRow row : list) {
            String field = row.getString("field_desc");
            if (field != null) {
                fields.add(field);
            }
        }
        return fields;
    }

    public static RecordHistory build(long recordId, User currentUser, RecordChangeType changeType,
                                      String fieldDesc, String oldValue, String newValue) {
        return build(recordId, currentUser, changeType, fieldDesc, oldValue, newValue, null);
    }

    public static RecordHistory build(long recordId, User currentUser, RecordChangeType changeType,
                                      String fieldDesc, String oldValue, String newValue, Long commentId) {
        RecordHistory recHistory = new RecordHistory.Builder()
            .setRecordId(recordId)
            .setUser(currentUser)
            .setChangeType(changeType)
            .setFieldDesc(fieldDesc)
            .setOldValue(oldValue)
            .setNewValue(newValue)
            .setCommentId(commentId)
            .build();

        return recHistory;
    }

    public static void insertInTransaction(List<RecordHistory> histories) {
        try (Transaction transaction = DB.beginTransaction()) {
            for (RecordHistory h : histories) {
                h.save();
            }
            transaction.commit();
        }
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public long getRecordId() {
        return recordId;
    }

    public void setRecordId(long recordId) {
        this.recordId = recordId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getFieldDesc() {
        return fieldDesc;
    }

    public void setFieldDesc(String fieldDesc) {
        this.fieldDesc = fieldDesc;
    }

    public String getOldValue() {
        return oldValue;
    }

    public void setOldValue(String oldValue) {
        this.oldValue = SqlUtils.replaceApostropheByBackApostrophe(oldValue);
    }

    public String getNewValue() {
        return newValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = SqlUtils.replaceApostropheByBackApostrophe(newValue);
    }

    public Timestamp getCreateTimestamp() {
        return createTimestamp;
    }

    public void setCreateTimestamp(Timestamp createTimestamp) {
        this.createTimestamp = createTimestamp;
    }

    public RecordChangeType getChangeType() {
        return changeType;
    }

    public void setChangeType(RecordChangeType changeType) {
        this.changeType = changeType;
    }

    public long getCommentId() {
        return commentId;
    }

    public void setCommentId(Long commentId) {
        this.commentId = commentId;
    }

    @Override
    public void save() {
        String commentIdStr = commentId != null ? String.format("'%s'", commentId) : "null";
        String query = String.format(
            "INSERT INTO %s " +
                "(record_id, user_id, change_type, field_desc, " +
                "old_value, new_value, creation_timestamp, comment_id) " +
                "VALUES ( %d, %d, '%s', '%s', " +
                "'%s', '%s', now(), %s)",
            QualifiedTableName, recordId, user.getId(), changeType.toString().toLowerCase(),
            fieldDesc, oldValue, newValue, commentIdStr);
        SqlUpdate sqlUpdate = DB.sqlUpdate(query);
        sqlUpdate.execute();
    }

    public static class Builder {
        private long recordId;

        private User user;

        private RecordChangeType changeType;

        private String fieldDesc;

        private String oldValue;

        private String newValue;

        private Long commentId = null;

        public Builder setRecordId(long recordId) {
            this.recordId = recordId;
            return this;
        }

        public Builder setUser(User user) {
            this.user = user;
            return this;
        }

        public Builder setChangeType(RecordChangeType changeType) {
            this.changeType = changeType;
            return this;
        }

        public Builder setFieldDesc(String fieldDesc) {
            this.fieldDesc = fieldDesc;
            return this;
        }

        public Builder setOldValue(String oldValue) {
            this.oldValue = oldValue;
            return this;
        }

        public Builder setNewValue(String newValue) {
            this.newValue = newValue;
            return this;
        }

        public Builder setCommentId(Long commentId) {
            this.commentId = commentId;
            return this;
        }

        public RecordHistory build() {
            RecordHistory history = new RecordHistory();
            history.setRecordId(recordId);
            history.setUser(user);
            history.setChangeType(changeType);
            history.setFieldDesc(fieldDesc);
            history.setOldValue(oldValue);
            history.setNewValue(newValue);
            history.setCommentId(commentId);
            return history;
        }
    }
}

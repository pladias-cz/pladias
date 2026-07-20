package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;

import java.sql.Timestamp;

@Entity
@Table(name = UserActivity.QualifiedTableName)
@SuppressWarnings("serial")
public class UserActivity extends Model {
    public static final String QualifiedTableName = "public.user_activity_log";

    public static final int Login = 1;
    public static final int Logout = 2;
    public static final int BiblioSearch = 3;
    public static final int RecordSearch = 4;
    public static final int BatchValidation = 5;
    public static final int BatchImport = 6;
    public static final int TraitValidation = 7;
    public static final int TraitImport = 8;
    public static final int WriteComment = 9;
    public static final int ResolveComment = 10;
    public static final int EditRecord = 11;
    public static final int UpdateRecordCoords = 12;
    public static final int ChangeUserRights = 13;
    public static final int SubmitSearchRequest = 14;
    public static final int MainMapView = 15;
    public static final int DetailedMapView = 16;
    public static final int PrintPreview = 17;
    public static final int GeoserverWfsQuery = 18;
    public static final int TraitDownload = 19;
    public static final int TraitUpload = 20;
    public static final int ComplexTraitDownload = 21;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "public.users_activity_log_id_seq")
    private int id;

    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Temporal(TemporalType.TIMESTAMP)
    @WhenCreated
    @Column(name = "create_timestamp", updatable = false)
    private Timestamp createTimestamp;

    private int activityId;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    private String description;

    public static final Finder<Integer, UserActivity> find() {
        return new Finder<>(UserActivity.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Timestamp getCreateTimestamp() {
        return createTimestamp;
    }

    public void setCreateTimestamp(Timestamp createTimestamp) {
        this.createTimestamp = createTimestamp;
    }

    public int getActivityId() {
        return activityId;
    }

    public void setActivityId(int activityId) {
        this.activityId = activityId;
    }

    public String getOldValue() {
        return oldValue;
    }

    public void setOldValue(String oldValue) {
        this.oldValue = oldValue;
    }

    public String getNewValue() {
        return newValue;
    }

    public void setNewValue(String newValue) {
        this.newValue = newValue;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}

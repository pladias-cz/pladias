package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;

import java.sql.Timestamp;

@Entity
@Table(name = Batch.QualifiedTableName)
@SuppressWarnings("serial")
public class Batch extends Model {

    public static final String QualifiedTableName = "atlas.batch";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.batch_id_seq")
    private long id;

    @ManyToOne
    @JoinColumn(name = "author_id", referencedColumnName = "id")
    private User author;


    @ManyToOne
    @JoinColumn(name = "committer_id", referencedColumnName = "id")
    private User committer;

    @WhenCreated
    @Column(name = "creation_timestamp")
    private Timestamp createTimestamp;

    private boolean imported = false;

    private String deletionCode;

    public static final Finder<Long, Batch> find() {
        return new Finder<>(Batch.class);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public User getCommitter() {
        return committer;
    }

    public void setCommitter(User comitter) {
        this.committer = comitter;
    }

    public User getAuthor() {
        return author;
    }

    public void setAuthor(User author) {
        this.author = author;
    }

    public Timestamp getCreateTimestamp() {
        return createTimestamp;
    }

    public void setCreateTimestamp(Timestamp createTimestamp) {
        this.createTimestamp = createTimestamp;
    }

    public boolean getImported() {
        return imported;
    }

    public void setImported(boolean imported) {
        this.imported = imported;
    }

    public String getDeletionCode() {
        return deletionCode;
    }

    public void setDeletionCode(String deletionCode) {
        this.deletionCode = deletionCode;
    }
}

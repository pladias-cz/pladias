package models;

import io.ebean.*;
import jakarta.persistence.*;

@Entity
@Table(name = RecordAuthor.QualifiedTableName)
@SuppressWarnings("serial")
public class RecordAuthor extends Model {
    public static final String QualifiedTableName = "atlas.records_authors";
    @EmbeddedId
    private final RecordAuthorPK id;
    @ManyToOne
    @JoinColumn(name = "records_id", referencedColumnName = "id", updatable = false, insertable = false)
    private Record record;
    @ManyToOne
    @JoinColumn(name = "authors_id", referencedColumnName = "id", updatable = false, insertable = false)
    private Author author;
    @Column(name = "succession")
    private Integer succession;

    public RecordAuthor() {
        id = new RecordAuthorPK();
    }

    public static Finder<RecordAuthorPK, RecordAuthor> find() {
        return new Finder<>(RecordAuthor.class);
    }

    public Record getRecord() {
        return record;
    }

    public void setRecord(Record record) {
        this.record = record;
        if (record.getId() != null) {
            id.setRecordId(record.getId());
        }
    }

    public RecordAuthorPK getId() {
        return id;
    }

    @Override
    public void save() {
        if (author.getId() == 0) {
            author.save();
            id.setAuthorId(author.getId());
        }
        super.save();
    }

    public Author getAuthor() {
        return author;
    }

    public void setAuthor(Author author) {
        this.author = author;
        if (author.getId() != 0) {
            id.setAuthorId(author.getId());
        }
    }

    public Integer getSuccession() {
        return succession;
    }

    public void setSuccession(Integer succession) {
        this.succession = succession;
    }

    @Override
    public boolean equals(Object other) {
        if (other == null)
            return false;

        if (!(other instanceof RecordAuthor otherRa))
            return false;

        return otherRa.id.getAuthorId() == id.getAuthorId() &&
            otherRa.id.getRecordId() == id.getRecordId();
    }

    @Override
    public int hashCode() {
        return 31 * id.getAuthorId() + 17 * id.getRecordId().intValue();
    }
}

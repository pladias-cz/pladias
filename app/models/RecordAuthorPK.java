package models;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class RecordAuthorPK {

    @Column(name = "records_id")
    private Long recordId;

    @Column(name = "authors_id")
    private Integer authorId;

    public Long getRecordId() {
        return recordId;
    }

    public void setRecordId(Long recordId) {
        this.recordId = recordId;
    }

    public Integer getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Integer authorId) {
        this.authorId = authorId;
    }

    public int hashCode() {
        return (int)(17 * recordId + 11 * authorId);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;

        if (!(obj instanceof RecordAuthorPK other))
            return false;

        return (recordId == other.recordId && authorId == other.authorId);
    }
}

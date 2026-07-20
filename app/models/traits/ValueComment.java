package models.traits;

import io.ebean.*;
import jakarta.persistence.*;


@SuppressWarnings("serial")
@Table(name = ValueComment.QualifiedName)
@Entity
public class ValueComment extends Model {
    public static final String QualifiedName = "measurements.data_comment";
    @Id
    @Embedded
    private DatatypePK commentPk;
    @Column(name = "comment")
    private String comment;

    public static final Finder<DatatypePK, ValueComment> find() {
        return new Finder<>(ValueComment.class);
    }

    public DatatypePK getCommentPk() {
        return commentPk;
    }

    public void setCommentPk(DatatypePK commentPk) {
        this.commentPk = commentPk;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

}

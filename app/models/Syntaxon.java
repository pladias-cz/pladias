package models;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@SuppressWarnings("serial")
@Table(name = Syntaxon.QualifiedName)
public class Syntaxon extends Model {
    public static final String QualifiedName = "public.syntaxons";
    @Id
    private int id;
    @Column(name = "code")
    private String foreignId;
    @Column(name = "lft")
    private int left;
    @Column(name = "rgt")
    private int right;
    private int depth;
    private int rank;
    @Column(name = "name_cz")
    private String nameCz;
    @Column(name = "name_lat")
    private String nameLat;
    private String author;

    public static final Finder<Integer, Syntaxon> find() {
        return new Finder<>(Syntaxon.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getForeignId() {
        return foreignId;
    }

    public void setForeignId(String foreignId) {
        this.foreignId = foreignId;
    }

    public int getLeft() {
        return left;
    }

    public void setLeft(int left) {
        this.left = left;
    }

    public int getRight() {
        return right;
    }

    public void setRight(int right) {
        this.right = right;
    }

    public int getDepth() {
        return depth;
    }

    public void setDepth(int depth) {
        this.depth = depth;
    }

    public int getRank() {
        return rank;
    }

    public void setRank(int rank) {
        this.rank = rank;
    }

    public String getNameCz() {
        return nameCz;
    }

    public void setNameCz(String nameCz) {
        this.nameCz = nameCz;
    }

    public String getNameLat() {
        return nameLat;
    }

    public void setNameLat(String nameLat) {
        this.nameLat = nameLat;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public boolean equals(Object o) {
        if (!(o instanceof Syntaxon other))
            return false;

        return (id == other.id);
    }

    public int hashCode() {
        return id * 193;
    }
}

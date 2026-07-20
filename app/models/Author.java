package models;

import helpers.compare.CzechComparator;
import io.ebean.*;
import jakarta.persistence.*;
import org.apache.commons.lang3.StringUtils;

import java.util.Comparator;
import java.util.List;

@Entity
@Table(name = Author.QualifiedTableName)
@SuppressWarnings("serial")
public class Author extends Model implements Comparable<Author> {
    public static final String QualifiedTableName = "atlas.authors";
    public static final int AuthorUnknownId = 1;
    public static final int AuthorUnreadableId = 2;
    private static final Comparator<String> czComparator = new CzechComparator();
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.authors_id_seq")
    private int id;
    private String name;
    private String surname;

    public Author() {
    }
    public Author(int id, String name, String surname) {
        this.id = id;
        this.name = name;
        this.surname = surname;
    }

    public static final Finder<Integer, Author> find() {
        return new Finder<>(Author.class);
    }

    public static Author findByName(String surname, String name) {
        List<Author> authorList = find().query().where().eq("name", name).eq("surname", surname).findList();
        if (authorList.size() == 0)
            return null;
        return authorList.get(0);
    }

    public static Author findById(int id) {
        return find().byId(id);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSurname() {
        return surname;
    }

    public void setSurname(String surname) {
        this.surname = surname;
    }

    public String toString() {
        StringBuffer buffer = new StringBuffer();
        buffer.append(surname);
        if (StringUtils.isNotBlank(name)) {
            buffer.append(", ").append(name);
        }
        return buffer.toString();
    }

    @Override
    public int hashCode() {
        int hashVal = 3;
        if (surname != null) {
            hashVal = hashVal * surname.hashCode();
        }
        if (name != null) {
            hashVal = hashVal + 31 * name.hashCode();
        }
        return hashVal;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof Author otherAuthor)) {
            return false;
        }
        return StringUtils.equals(surname, otherAuthor.surname) && StringUtils.equals(name, otherAuthor.name);
    }

    public void save() {
        super.save();
    }

    @Override
    public int compareTo(Author other) {
        int surnameCompare = czComparator.compare(surname, other.surname);
        if (surnameCompare != 0) {
            return surnameCompare;
        }

        int nameCompare = czComparator.compare(name, other.surname);
        return nameCompare;
    }
}

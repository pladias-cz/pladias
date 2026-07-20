package models.traits;

import io.ebean.*;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.List;

@SuppressWarnings("serial")
@Table(name = Section.QualifiedName)
@Entity
public class Section extends Model {
    public static final String QualifiedName = "measurements.sections";
    @Id
    private int id;
    @Column(name = "name_cz", nullable = false)
    private String nameCz;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(name = "lft", nullable = false)
    private int left;

    @Column(name = "rgt", nullable = false)
    private int right;

    @Column(name = "description_cs")
    private String descriptionCz;

    @Column(name = "description_en")
    private String descriptionEn;

    private int depth;

    public static final Finder<Integer, Section> find() {
        return new Finder<>(Section.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNameCz() {
        return nameCz;
    }

    public void setNameCz(String nameCz) {
        this.nameCz = nameCz;
    }

    public String getNameEn() {
        return nameEn;
    }

    public void setNameEn(String nameEn) {
        this.nameEn = nameEn;
    }

    public String getDescriptionCz() {
        return descriptionCz;
    }

    public void setDescriptionCz(String descriptionCz) {
        this.descriptionCz = descriptionCz;
    }

    public String getDescriptionEn() {
        return descriptionEn;
    }

    public void setDescriptionEn(String descriptionEn) {
        this.descriptionEn = descriptionEn;
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

    public synchronized List<Feature> getSubordinateFeatures() {
        return Feature.find().query().where().eq("section_id", id).findList();
    }

    public synchronized List<Feature> getSubordinateFeaturesTree() {
        String sql = prepareFeatureTreeQuery();
        RawSql rawSql = RawSqlBuilder.parse(sql).create();

        Query<Feature> sqlQuery = DB.find(Feature.class);
        sqlQuery.setRawSql(rawSql);
        return sqlQuery.findList();
    }

    private String prepareFeatureTreeQuery() {
        StringBuilder builder = new StringBuilder();
        List<Object> sectionIds = Section.find().query().where().ge("left", left).le("right", right).findIds();
        builder.append(" SELECT F.id FROM ").append(Feature.QualifiedName).append(" AS F ")
            .append(" INNER JOIN ").append(Section.QualifiedName).append(" AS S ON F.section_id = S.id ")
            .append(" WHERE section_id IN (");
        for (Object sectionId : sectionIds) {
            builder.append(sectionId.toString()).append(',');
        }
        builder.append('0').append(')');
        builder.append(" ORDER BY S.lft ASC, F.succession ASC ");
        return builder.toString();
    }
}

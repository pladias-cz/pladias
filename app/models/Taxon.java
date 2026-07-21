package models;

import cache.TaxonCache;
import io.ebean.*;
import jakarta.persistence.*;
import org.apache.commons.lang3.tuple.Pair;
import play.data.validation.Constraints.Required;
import utils.ProjectUtils;
import utils.RecordStatistics;

import java.util.*;

@Entity
@Table(name = Taxon.QualifiedName)
@SuppressWarnings("serial")
public class Taxon extends Model {
    public static final String QualifiedName = "public.taxons";
    @ManyToMany
    @JoinTable(name = "atlas.taxons_users")
    public List<User> supervisors = new ArrayList<>();
    @Id
    @Column(name = "id")
    private long id;
    @Column(name = "id_dani")
    private Long idDanihelka;
    @Column(name = "lft", nullable = false)
    private int left;
    @Column(name = "rgt", nullable = false)
    private int right;
    private int depth;
    @Column(name = "parents", nullable = true)
    private String hybridParentage;
    @Column(name = "name_html", nullable = true)
    private String nameHtml;
    @ManyToOne
    @Column(nullable = false, name = "rank")
    @JoinColumn(name = "rank", referencedColumnName = "id")
    private TaxonRank rank;
    @Column(name = "name_cz")
    private String nameCz;
    @Required
    @Column(name = "name_lat")
    private String nameLat;
    private String author;
    private boolean suppressed;
    private String comment;
    private Taxon parent;
    @Transient
    private List<Taxon> children;
    @OneToMany
    @JoinColumn(name = "taxon_id", referencedColumnName = "id")
    private List<TaxonSynonym> synonyms;

    public static final Finder<Long, Taxon> find() {
        return new Finder<>(Taxon.class);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public Long getIdDanihelka() {
        return idDanihelka;
    }

    public void setIdDanihelka(Long idDanihelka) {
        this.idDanihelka = idDanihelka;
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

    public TaxonRank getRank() {
        return rank;
    }

    public void setRank(TaxonRank rank) {
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

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public List<User> getSupervisors() {
        return supervisors;
    }

    public void setSupervisors(List<User> supervisors) {
        this.supervisors = supervisors;
    }

    public List<TaxonSynonym> getSynonyms() {
        return synonyms;
    }

    public String getNameHtml() {
        return nameHtml;
    }

    public void setNameHtml(String nameHtml) {
        this.nameHtml = nameHtml;
    }

    public Taxon getParent() {
        if (parent == null) {
            parent = Taxon.find().query().
                where().lt("left", getLeft())
                .gt("right", getRight())
                .eq("depth", getDepth() - 1)
                .findOne();
        }
        return parent;
    }

    public String getHybridParentage() {
        return hybridParentage;
    }

    public void setHybridParentage(String hybridParents) {
        this.hybridParentage = hybridParents;
    }

    public boolean isSuppressed() {
        return suppressed;
    }

    public void setSuppressed(boolean suppressed) {
        this.suppressed = suppressed;
    }

    public boolean isAncestorOf(Taxon possibleDescendant) {
        return left <= possibleDescendant.getLeft() &&
            right >= possibleDescendant.getRight();
    }

    public boolean isDescendant(Set<Taxon> roots) {
        if (roots.contains(this))
            return true;

        for (Taxon root : roots) {
            if (root.isAncestorOf(this))
                return true;
        }
        return false;
    }

    public List<Taxon> getChildren() {
        if (children == null) {
            children = Taxon.find().query().where().eq("depth", depth + 1)
                .gt("left", left)
                .lt("right", right)
                .orderBy("left asc")
                .findList();
        }
        return children;
    }

    public TaxonMapSettings getTaxonMapSettings() {
        return TaxonMapSettings.find().byId(id);
    }

    public CsvMapDetails getCsvMapDetail() {
        return CsvMapDetails.find().query().
            where().eq("taxonId", id).
            orderBy("datetime desc").
            setMaxRows(1).findOne();
    }

    public boolean hasTraitData() {
        String sql = String.format(
            "SELECT * FROM measurements.taxons_having_traitdata where taxon_id=%d", id);
        SqlQuery query = DB.sqlQuery(sql);
        SqlRow row = query.findOne();
        return (row != null);
    }

    public boolean pdfMapExists() {
        PdfMapPK key = new PdfMapPK(id, PdfMap.PngType);

        PdfMap map = PdfMap.find().ref(key);
        return (map != null);
    }

    public PdfMap getPdfMap() {
        PdfMapPK key = new PdfMapPK(id, PdfMap.PngType);
        return PdfMap.find().byId(key);
    }

    public boolean equals(Object o) {
        if (!(o instanceof Taxon other))
            return false;

        return id == other.id;
    }

    public int hashCode() {
        return 31 * (int) id;
    }


    //careful, this is very expensive operation!
    public TaxonStatistics getStatistics() {
        TaxonStatistics stats = new TaxonStatistics();
        stats.recordsDeclined = RecordStatistics.getRecordCountByStatus(id, RecordValidationStatus.Declined);
        stats.recordsAccepted = RecordStatistics.getRecordCountByStatus(id, RecordValidationStatus.Accepted);
        stats.recordsUncertain = RecordStatistics.getRecordCountByStatus(id, RecordValidationStatus.Uncertain);
        stats.recordsUnprocessed = RecordStatistics.getRecordCountByStatus(id, RecordValidationStatus.Unprocessed);
        stats.recordsIncludedInMap = RecordStatistics.getRecordCountIncludedInMap(id);

        stats.recordsTotal = stats.recordsAccepted + stats.recordsDeclined +
            stats.recordsUncertain + stats.recordsUnprocessed;

        stats.recordsCommented = RecordStatistics.getRecordCountWithComment(id);
        stats.recordsUncommented = stats.recordsTotal - stats.recordsCommented;

        stats.recordsBoundToQuadrants = RecordStatistics.getRecordBoundToQuadrants(id);
        stats.recordsBoundToSquares = RecordStatistics.getRecordBoundToSquares(id);

        stats.recordsBoundToCoords = RecordStatistics.getRecordsBoundToCoords(id);
        stats.recordsNotBoundToCoords = stats.recordsTotal - stats.recordsBoundToCoords -
            stats.recordsBoundToQuadrants - stats.recordsBoundToSquares;

        Set<QuadrantNew> acceptedSet = RecordStatistics.getQuadrantsByTaxonStatus(id, RecordValidationStatus.Accepted);
        stats.quadrantsValidated = acceptedSet.size();

        Set<QuadrantNew> uncertainSet = RecordStatistics.getQuadrantsByTaxonStatus(id, RecordValidationStatus.Uncertain);
        uncertainSet.removeAll(acceptedSet);
        stats.quadrantsUncertain = uncertainSet.size();

        Set<QuadrantNew> declinedSet = RecordStatistics.getQuadrantsByTaxonStatus(id, RecordValidationStatus.Declined);
        declinedSet.removeAll(acceptedSet);
        declinedSet.removeAll(uncertainSet);
        stats.quadrantsDeclined = declinedSet.size();

        Set<QuadrantNew> unprocessedSet = RecordStatistics.getQuadrantsByTaxonStatus(id, RecordValidationStatus.Unprocessed);
        unprocessedSet.removeAll(acceptedSet);
        unprocessedSet.removeAll(uncertainSet);
        unprocessedSet.removeAll(declinedSet);
        stats.quadrantsUnprocessed = unprocessedSet.size();

        List<Project> projects = ProjectUtils.getProjectsReferencingTaxon(this);
        for (Project project : projects) {
            int recordCount = RecordStatistics.getRecordCountByProject(this, project);
            stats.recordsByProject.add(Pair.of(project, recordCount));
        }

        return stats;
    }

    @Override
    public void save() {
        super.save();
        TaxonCache.getInstance().update(this);
    }

    @Override
    public void update() {
        super.update();
        TaxonCache.getInstance().update(this);
    }

    public boolean IsLeaf() {
        return (this.left + 1 == right);
    }

    /* Returns taxons hierarchy ordered from root to this taxon (inclusive)*/
    public Taxon[] getParentHierarchy() {
        Deque<Taxon> ancestors = new ArrayDeque<>();
        Taxon taxon = this;
        while (taxon != null) {
            ancestors.addFirst(taxon);
            taxon = taxon.getParent();
        }
        return ancestors.toArray(new Taxon[0]);
    }

}

package models.biblio;

import io.ebean.*;
import jakarta.persistence.*;
import models.Record;

@Entity
@Table(name = Bibliography.QualifiedTableName)
@SuppressWarnings("serial")
public class Bibliography extends Model {
    public static final String QualifiedTableName = "biblio.bibliography";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "biblio.bibliography_id_seq")
    private int id;

    @Transient
    private String originalSourceKey;

    private String authors;

    private Integer year;

    private String title;

    private String etc;

    private String remarks;

    private Long originalId;

    private boolean excerpted;

    private String journal;

    @Column(name = "journal_id")
    private String journalId;

    @Transient
    private Integer recordsCount;

    public static final Finder<Integer, Bibliography> find() {
        return new Finder<>(Bibliography.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getAuthors() {
        return authors;
    }

    public void setAuthors(String authors) {
        this.authors = authors;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getEtc() {
        return etc;
    }

    public void setEtc(String etc) {
        this.etc = etc;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public Long getOriginalId() {
        return originalId;
    }

    public void setOriginalId(Long originalId) {
        this.originalId = originalId;
    }

    public boolean isExcerpted() {
        return excerpted;
    }

    public void setExcerpted(boolean excerpted) {
        this.excerpted = excerpted;
    }

    public String getJournal() {
        return journal;
    }

    public void setJournal(String journal) {
        this.journal = journal;
    }

    public String getJournalId() {
        return journalId;
    }

    public void setJournalId(String journalId) {
        this.journalId = journalId;
    }

    public String getOriginalSourceKey() {
        return originalSourceKey;
    }

    public void setOriginalSourceKey(String originalSourceKey) {
        this.originalSourceKey = originalSourceKey;
    }

    public int getRecordsCount() {
        if (recordsCount == null) {
            String sql = String.format("select count(*) as CNT from %s where biblio_id = %d", Record.QualifiedTableName, id);
            SqlQuery sqlQuery = DB.sqlQuery(sql);

            SqlRow row = sqlQuery.findOne();
            recordsCount = row.getInteger("CNT");
        }
        return recordsCount;
    }
}

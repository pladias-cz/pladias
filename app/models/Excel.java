package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;
import org.apache.commons.io.FilenameUtils;
import utils.ExcelFilenameGenerator;
import utils.PladiasStringUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.sql.Timestamp;

@Entity
@Table(name = Excel.QualifiedTableName)
@SuppressWarnings("serial")
public class Excel extends Model {
    public static final String QualifiedTableName = "atlas.excel";


    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.batch_id_seq")
    private Long id;

    @Lob
    @Column(name = "processed_file")
    private byte[] processedFile;

    @OneToOne(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "batch_id", referencedColumnName = "id")
    private Batch batch;

    @WhenCreated
    private Timestamp datetime;

    private int warnings;

    private int errors;

    private int infos;

    private int records;

    private String filename;

    public static Finder<Long, Excel> find() {
        return new Finder<>(Excel.class);
    }

    public InputStream getProcessedFileInputStream() {
        return getInputStream(processedFile);
    }

    private InputStream getInputStream(byte[] data) {
        if (data == null)
            throw new UnsupportedOperationException("data is null");
        return new ByteArrayInputStream(data);
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Batch getBatch() {
        return batch;
    }

    public void setBatch(Batch batch) {
        this.batch = batch;
    }

    public Timestamp getDatetime() {
        return datetime;
    }

    public void setDatetime(Timestamp datetime) {
        this.datetime = datetime;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = FilenameUtils.getName(filename);
    }

    public String getImportedFilename() {
        String basename = FilenameUtils.getBaseName(filename).replace(' ', '_');
        String suffix = FilenameUtils.getExtension(filename);
        return String.format("%s_IMPORTED.%s", basename, suffix);
    }

    public String getVersionDecoratedFilename() {
        String versionDecoratedFilename = ExcelFilenameGenerator.generateDecoratedFileName(filename);
        return PladiasStringUtils.normalize(versionDecoratedFilename);
    }

    public byte[] getProcessedFile() {
        return processedFile;
    }

    public void setProcessedFile(byte[] processedFile) {
        this.processedFile = processedFile;
    }

    public int getWarnings() {
        return warnings;
    }

    public void setWarnings(int warnings) {
        this.warnings = warnings;
    }

    public int getErrors() {
        return errors;
    }

    public void setErrors(int errors) {
        this.errors = errors;
    }

    public int getInfos() {
        return infos;
    }

    public void setInfos(int infos) {
        this.infos = infos;
    }

    public int getRecords() {
        return records;
    }

    public void setRecords(int records) {
        this.records = records;
    }
}

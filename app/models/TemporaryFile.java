package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;
import org.apache.commons.io.FilenameUtils;

import java.sql.Timestamp;

@Entity
@Table(name = TemporaryFile.QualifiedTableName)
@SuppressWarnings("serial")
public class TemporaryFile extends Model {
    public static final String QualifiedTableName = "public.temporary_files";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "public.temporary_files_id_seq")
    private Integer id;

    @Lob
    @Column(name = "data")
    private byte[] data;

    @Column(name = "filename")
    private String filename;

    @Column(name = "extension")
    private String extension;

    @WhenCreated
    private Timestamp datetime;

    public static Finder<Integer, TemporaryFile> find() {
        return new Finder<Integer, TemporaryFile>(TemporaryFile.class);
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = FilenameUtils.getName(filename);
    }

    public String getExtension() {
        return extension;
    }

    public void setExtension(String extension) {
        this.extension = extension;
    }

    public Timestamp getDatetime() {
        return datetime;
    }

    public void setDatetime(Timestamp datetime) {
        this.datetime = datetime;
    }
}

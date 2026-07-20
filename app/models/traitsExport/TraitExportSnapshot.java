package models.traitsExport;

import io.ebean.Finder;
import io.ebean.Model;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;
import play.data.validation.Constraints;
import service.trait.export.TraitExportResponse;

import java.sql.Timestamp;

@Entity
@Table(name = TraitExportSnapshot.QualifiedTableName)
@SuppressWarnings("serial")
public class TraitExportSnapshot extends Model {

    public static final String QualifiedTableName = "measurements.trait_export_snapshots";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "measurements.trait_export_snapshots_id_seq")
    private Integer id;

    @Lob
    @Constraints.Required
    private byte[] data;

    @Constraints.Required
    private String filename;

    private String description;

    @WhenCreated
    private Timestamp datetime;

    public static final Finder<Integer, TraitExportSnapshot> find() {
        return new Finder<>(TraitExportSnapshot.class);
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
        this.filename = filename;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Timestamp getDatetime() {
        return datetime;
    }

    public void setDatetime(Timestamp datetime) {
        this.datetime = datetime;
    }

    public TraitExportResponse toExportResponse() {
        return new TraitExportResponse(data, filename);
    }
}

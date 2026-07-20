package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;
import org.apache.commons.io.FilenameUtils;
import play.Logger;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.sql.Timestamp;

@Entity
@Table(name = PdfMap.QualifiedTableName)
@SuppressWarnings("serial")
public class PdfMap extends Model {

    public static final String QualifiedTableName = "atlas.pdf_map";
    public static final int PngType = 1;
    public static final int PdfType = 2;
    public static final int PdfTypeFrontpage = 3;


    @Id
    @Embedded
    PdfMapPK id = new PdfMapPK();

    @Lob
    @Column(name = "data")
    private byte[] data;

    private String filename;

    @WhenCreated
    @Column(name = "creation_timestamp")
    private Timestamp createTimestamp;

    @Column(name = "is_overridden")
    private boolean overridden;

    public static Finder<PdfMapPK, PdfMap> find() {
        return new Finder<>(PdfMap.class);
    }

    public static PdfMap find(long taxonId, int type) {
        PdfMapPK key = new PdfMapPK(taxonId, type);
        PdfMap map = PdfMap.find().byId(key);
        return map;
    }

    public static PdfMap findOrCreate(long taxonId, int type) {
        PdfMapPK key = new PdfMapPK(taxonId, type);
        PdfMap map = PdfMap.find().byId(key);
        if (map == null) {
            Logger.info("PdfMap entry not found - creating new");
            map = new PdfMap();
            map.setTaxonId(taxonId);
            map.setFiletype(type);
        }
        return map;
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

    public Timestamp getCreateTimestamp() {
        return createTimestamp;
    }

    public void setCreateTimestamp(Timestamp createTimestamp) {
        this.createTimestamp = createTimestamp;
    }

    public InputStream getPdfMapInputStream() {
        if (data == null)
            throw new UnsupportedOperationException("data is null");

        return new ByteArrayInputStream(data);
    }

    public long getTaxonId() {
        return id.getTaxonId();
    }

    public void setTaxonId(long taxonId) {
        this.id.setTaxonId(taxonId);
    }

    public int getFiletype() {
        return id.getFiletype();
    }

    public void setFiletype(int type) {
        this.id.setFiletype(type);
    }

    public boolean isOverridden() {
        return overridden;
    }

    public void setOverridden(boolean overridden) {
        this.overridden = overridden;
    }

}

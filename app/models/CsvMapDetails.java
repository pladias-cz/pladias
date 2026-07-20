package models;

import io.ebean.*;
import io.ebean.annotation.WhenCreated;
import jakarta.persistence.*;
import org.apache.commons.io.FilenameUtils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.sql.Timestamp;

@Entity
@SuppressWarnings("serial")
@Table(name = CsvMapDetails.QualifiedTableName)
public class CsvMapDetails extends Model {
    public static final String QualifiedTableName = "atlas.csv_map_details";

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.csv_map_details_id_seq")
    private Integer id;

    @Lob
    @Column(name = "csvdata")
    private byte[] csvData;

    @Lob
    @Column(name = "csvdata_map_render")
    private byte[] csvDataMapRender;

    @Column(name = "filename")
    private String filename;

    @Column(name = "taxon_id")
    private long taxonId;

    @WhenCreated
    @Column(name = "creation_timestamp")
    private Timestamp datetime;


    public CsvMapDetails() {
    }

    public CsvMapDetails(byte[] csvdata, byte[] csvDataMapRender, String filename, long taxonId) {
        this.csvData = csvdata;
        this.csvDataMapRender = csvDataMapRender;
        this.filename = filename;
        this.taxonId = taxonId;
    }

    public static final Finder<Integer, CsvMapDetails> find() {
        return new Finder<>(CsvMapDetails.class);
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public byte[] getCsvData() {
        return csvData;
    }

    public void setCsvData(byte[] csvdata) {
        this.csvData = csvdata;
    }

    public byte[] getCsvDataMapRender() {
        return csvDataMapRender;
    }

    public void setCsvDataMapRender(byte[] csvdataMapRender) {
        this.csvDataMapRender = csvdataMapRender;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = FilenameUtils.getName(filename);
    }

    public long getTaxonId() {
        return taxonId;
    }

    public void setTaxonId(long taxonId) {
        this.taxonId = taxonId;
    }

    public Timestamp getDatetime() {
        return datetime;
    }

    public void setDatetime(Timestamp datetime) {
        this.datetime = datetime;
    }

    public InputStream getCsvDataInputStream() {
        if (csvData == null)
            throw new UnsupportedOperationException("data is null");

        return new ByteArrayInputStream(csvData);
    }

    public InputStream getCsvDataMapRenderInputStream() {
        if (csvDataMapRender == null)
            throw new UnsupportedOperationException("data is null");

        return new ByteArrayInputStream(csvDataMapRender);
    }
}

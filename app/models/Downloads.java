package models;

import io.ebean.*;
import jakarta.persistence.*;

@Entity
@Table(name = Downloads.QualifiedTableName)
@SuppressWarnings("serial")
public class Downloads extends Model {

    public static final String QualifiedTableName = "public.downloads";

    @Id
    private String id;

    @Column(name = "name_cz")
    private String nameCz;

    @Column(name = "name_eng")
    private String nameEng;

    @Column(name = "description_cz")
    private String descriptionCz;

    @Column(name = "description_eng")
    private String descriptionEng;

    private String version;

//    private Date datum;

    private String manager;

    @Column(name = "filetype")
    private String fileType;

    @Column(name = "filepath")
    private String filePath;

    private int succession;

    public static final Finder<Integer, Downloads> find() {
        return new Finder<>(Downloads.class);
    }

    public String getId() {
        return id;
    }

    public String getNameCz() {
        return nameCz;
    }

    public String getNameEng() {
        return nameEng;
    }

    public String getDescriptionCz() {
        return descriptionCz;
    }

    public String getDescriptionEng() {
        return descriptionEng;
    }

    public String getVersion() {
        return version;
    }

    public String getManager() {
        return manager;
    }

    public String getFileType() {
        return fileType;
    }

    public String getFilePath() {
        return filePath;
    }

    public int getSuccession() {
        return succession;
    }

    @Override
    public void save() {
        //not intended for modification
        throw new UnsupportedOperationException();
    }

    @Override
    public void update() {
        //not intended for modification
        throw new UnsupportedOperationException();
    }
}

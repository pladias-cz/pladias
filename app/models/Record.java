package models;

import comparators.AuthorsEtAliiComparator;
import geom.Coordinates;
import io.ebean.DB;
import io.ebean.Finder;
import io.ebean.Model;
import io.ebean.SqlRow;
import jakarta.persistence.*;
import models.biblio.Bibliography;
import models.nonvascular.NonVascularRecordExtension;

import java.sql.Timestamp;
import java.util.*;

@Entity
@Table(name = Record.QualifiedTableName)
@SuppressWarnings("serial")
public class Record extends Model {

    public static final String QualifiedTableName = "atlas.records";


    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "atlas.records_id_seq")
    private Long id;

    @ManyToOne(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "batch_id", referencedColumnName = "id")
    private Batch batch;

    @ManyToOne
    @Column(nullable = false, name = "taxon_id")
    @JoinColumn(name = "taxon_id", referencedColumnName = "id")
    private Taxon taxon;

    private String originalName;
    private String locality; //textual description

    @ManyToOne
    @Column(nullable = true, name = "nearest_town_id")
    @JoinColumn(name = "nearest_town_id", referencedColumnName = "id")
    private District nearestTownLegacyId;

    private District nearestTownId;

    @Column(nullable = true, name = "nearest_town_text")
    private String nearestTownName;

    @ManyToOne
    @Column(nullable = true, name = "district_id")
    @JoinColumn(name = "district_id", referencedColumnName = "id")
    private District district; //okres

    private Double longitude;
    private Double latitude;

    @Column(nullable = true, name = "altitude_min")
    private Integer altitudeMin;

    @Column(nullable = true, name = "altitude_max")
    private Integer altitudeMax;

    @Column(name = "altitude_approx")
    private boolean altitudeApproximation;

    @Column(name = "gps_coords_source")
    private String gpsCoordsSource;

    @Column(nullable = true, name = "gps_coords_precision")
    private Integer gpsCoordsPrecision;

    @OneToMany(mappedBy = "record")
    @JoinColumn(name = "records_id", referencedColumnName = "id")
    private List<RecordAuthor> recordAuthors;

    @Transient
    private boolean recordAuthorsSorted = false;

    private String source;

    @ManyToMany(cascade = CascadeType.PERSIST)
    private List<Herbarium> herbariums = new ArrayList<>();

    @ManyToOne
    @Column(name = "phytochorion_id")
    @JoinColumn(name = "phytochorion_id", referencedColumnName = "rowid")
    private Phytochorion phytochorion;

    @Column(name = "phytochorion_computed")
    private boolean phytochorionComputed;


    @Column(name = "locked")
    private boolean locked;

    private Optional<QuadrantNew> quadrant;

    @ManyToMany(cascade = CascadeType.PERSIST)
    @JoinTable(
        name = "atlas.records_squares",
        joinColumns = @JoinColumn(name = "records_id"),
        inverseJoinColumns = @JoinColumn(name = "squares_id"))
    private List<MapSquareNew> mapSquares_legacy = new ArrayList<>();

    @ManyToMany(cascade = CascadeType.PERSIST)
    @JoinTable(
        name = "atlas.records_quadrants",
        joinColumns = @JoinColumn(name = "records_id"),
        inverseJoinColumns = @JoinColumn(name = "quadrants_id"))
    private List<QuadrantNew> quadrants_legacy = new ArrayList<>();

    @Column(name = "quadrant_computed")
    private boolean quadrantComputed_legacy;

    @ManyToOne
    @JoinColumn(name = "validation_status", referencedColumnName = "id")
    private RecordValidationStatus validationStatus;

    @ManyToOne
    @JoinColumn(name = "biblio_id", referencedColumnName = "id")
    private Bibliography bibliography;

    private String comment;

    @OneToOne
    @Column(name = "project_id")
    @JoinColumn(name = "project_id", referencedColumnName = "id")
    private Project project;

    @ManyToOne
    @Column(name = "originality_id")
    @JoinColumn(name = "originality_id", referencedColumnName = "id")
    private RecordOriginalityStatus originalityStatus;

    @OneToMany(cascade = CascadeType.PERSIST)
    @OrderBy("creation_timestamp asc")
    private List<RecordComment> comments;

    @Column(name = "herbarium_quality")
    private boolean herbariumQuality;

    //-----------------
    //fields used for foreign data:
    //-----------------
    @Column(name = "original_id")
    private String originalId;

    @Column(name = "remark_excerption")
    private String remarkExcerption;

    @Column(name = "remark_other")
    private String remarkOther;

    @Column(name = "remark_doubt")
    private String remarkDoubt;

    @Column(name = "environment")
    private String environment;

    private String detrev;

    @Column(name = "include_in_map")
    private boolean includedInMap;

    @Column(name = "datum")
    private Date date;

    @Column(name = "datum_precision")
    private String datePrecision;

    @ManyToOne(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "license_id", referencedColumnName = "id")
    private License license;

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "edit_timestamp")
    private Timestamp lastEditTimestamp;

    @Transient
    private NonVascularRecordExtension nonVascularExtension;

    public Record() {
        phytochorionComputed = false;
        quadrantComputed_legacy = false;
        includedInMap = false;
    }

    public static Finder<Long, Record> find() {
        return new Finder<>(Record.class);
    }

    /**
     * Batch check if records have history. Returns a map of record ID to whether it has history.
     * This avoids N+1 queries when checking multiple records.
     *
     * @param recordIds list of record IDs to check
     * @return map mapping record ID to hasHistory flag
     */
    public static Map<Long, Boolean> hasHistoryById(List<Long> recordIds) {
        if (recordIds == null || recordIds.isEmpty()) {
            return new HashMap<>();
        }

        // Build IN clause with named parameters for each ID
        StringBuilder inClause = new StringBuilder();
        int idx = 0;
        for (Long id : recordIds) {
            if (idx > 0) {
                inClause.append(", ");
            }
            inClause.append(":id").append(idx);
            idx++;
        }

        String sql = String.format(
            "SELECT DISTINCT record_id FROM %s WHERE record_id IN (%s)",
            RecordHistory.QualifiedTableName, inClause
        );

        io.ebean.SqlQuery query = DB.sqlQuery(sql);
        idx = 0;
        for (Long id : recordIds) {
            query.setParameter("id" + idx, id);
            idx++;
        }

        List<SqlRow> rows = query.findList();

        // Build result map - default to false for all IDs
        Map<Long, Boolean> result = new HashMap<>();
        for (Long id : recordIds) {
            result.put(id, false);
        }

        // Mark IDs that have history as true
        for (SqlRow row : rows) {
            Long recordId = row.getLong("record_id");
            result.put(recordId, true);
        }

        return result;
    }

    @PrePersist
    public void prePersist() {
        if (validationStatus == null) {
            validationStatus = new RecordValidationStatus();
            validationStatus.setId(RecordValidationStatus.Unprocessed);
        }
    }

    public Long getId() {
        return id;
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

    public String getLocality() {
        return locality;
    }

    public void setLocality(String locality) {
        this.locality = locality;
    }

    public District getNearestTownLegacy() {
        return nearestTownLegacyId;
    }

    private District getNearestTown() {
        if (nearestTownId == null) {
            Coordinates coords = getCoords();
            if (coords != null) {
                List<District> newHierarchy = District.findTownHierarchyByPoint(coords);
                if (!newHierarchy.isEmpty()) {
                    nearestTownId = newHierarchy.getLast();
                }
            }
        }
        return nearestTownId;
    }

    public String getNearestTownName() {
        District nearestTown = getNearestTown();
        if (nearestTown == null) {
            return "";
        }

        District d = District.find().query().where().
            lt("left", nearestTown.getLeft()).
            gt("right", nearestTown.getRight()).
            eq("depth", DistrictType.COMMUNITY_ID).findOne();

        if (d != null) {
            return d.getName();
        }
        return "";
    }

    public String getNearestTownText() {
        return nearestTownName;
    }

    public void setNearestTownText(String nearestTownName) {
        this.nearestTownName = nearestTownName;
    }

    public District getDistrict() {
        return district;
    }

    public void setDistrict(District district) {
        this.district = district;
    }

    public List<RecordAuthor> getRecordAuthors() {
        return recordAuthors;
    }

    public void setRecordAuthors(List<RecordAuthor> recordAuthors) {
        this.recordAuthors = recordAuthors;
        recordAuthorsSorted = false;
    }

    public List<Author> getAuthorsSorted() {
        if (!recordAuthorsSorted) {
            //this.refresh();

            recordAuthors.sort(new Comparator<>() {

                private final Comparator<RecordAuthor> etAliiComparator = new AuthorsEtAliiComparator();

                @Override
                public int compare(RecordAuthor o1, RecordAuthor o2) {
                    if (o1.getSuccession() == null && o2.getSuccession() == null) return 0;
                    if (o1.getSuccession() != null && o2.getSuccession() == null)
                        return -1;
                    if (o1.getSuccession() == null && o2.getSuccession() != null)
                        return 1;

                    int diff = o1.getSuccession() - o2.getSuccession();
                    if (diff != 0) return diff;
                    return etAliiComparator.compare(o1, o2);
                }
            });
            recordAuthorsSorted = true;
        }

        return extractAuthors();
    }

    private List<Author> extractAuthors() {
        List<Author> authors = new ArrayList<>();
        for (RecordAuthor ra : recordAuthors) {
            Author author = ra.getAuthor();
            authors.add(author);
        }
        return authors;
    }

    public void setFinders(List<RecordAuthor> recordAuthors) {
        this.recordAuthors = recordAuthors;
    }

    public Phytochorion getPhytochorion() {
        return phytochorion;
    }

    public void setPhytochorion(Phytochorion phytochorion) {
        this.phytochorion = phytochorion;
    }

    public boolean isPhytochorionComputed() {
        return phytochorionComputed;
    }

    public void setPhytochorionComputed(boolean isComputed) {
        this.phytochorionComputed = isComputed;
    }

    public Optional<QuadrantNew> getQuadrant() {
        if (quadrant == null) {
            Coordinates coords = getCoords();
            QuadrantNew candidate = coords.isValid() ? QuadrantNew.findByPoint(coords) : null;
            quadrant = Optional.ofNullable(candidate);
        }
        return quadrant;
    }

    public List<MapSquareNew> getSquaresLegacy() {
        return mapSquares_legacy;
    }

    public void setSquaresLegacy(List<MapSquareNew> mapSquares) {
        this.mapSquares_legacy = mapSquares;
    }

    public List<QuadrantNew> getQuadrantsLegacy() {
        return quadrants_legacy;
    }

    public void setQuadrantsLegacy(List<QuadrantNew> quadrants) {
        this.quadrants_legacy = quadrants;
    }

    public boolean isQuadrantLegacyComputed() {
        return quadrantComputed_legacy;
    }

    public void setQuadrantLegacyComputed(boolean isComputed) {
        this.quadrantComputed_legacy = isComputed;
    }

    public Taxon getTaxon() {
        return taxon;
    }

    public void setTaxon(Taxon taxon) {
        this.taxon = taxon;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public boolean hasCoords() {
        return getCoords().isValid();
    }

    public Coordinates getCoords() {
        return Coordinates.of(longitude, latitude);
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Integer getAltitudeMin() {
        return altitudeMin;
    }

    public void setAltitudeMin(Integer altitudeMin) {
        this.altitudeMin = altitudeMin;
    }

    public void setAltitudeMin(int altitudeMin) {
        this.altitudeMin = altitudeMin;
    }

    public Integer getAltitudeMax() {
        return altitudeMax;
    }

    public void setAltitudeMax(Integer altitudeMax) {
        this.altitudeMax = altitudeMax;
    }

    public void setAltitudeMax(int altitudeMax) {
        this.altitudeMax = altitudeMax;
    }

    public String getAltitudeRange() {
        if (getAltitudeMin() == null && getAltitudeMax() == null) {
            return "";
        } else if (getAltitudeMin().equals(getAltitudeMax()) || getAltitudeMax() == null) {
            return Integer.toString(getAltitudeMin());
        } else if (getAltitudeMin() == null) {
            return Integer.toString(getAltitudeMax());
        }
        return getAltitudeMin() + "-" + getAltitudeMax();
    }

    public Boolean isAltitudeApproximation() {
        return altitudeApproximation;
    }

    public void setAltitudeApproximation(boolean altitudeApproximation) {
        this.altitudeApproximation = altitudeApproximation;
    }

    public String getGpsCoordSource() {
        return gpsCoordsSource;
    }

    public void setGpsCoordSource(String gpsCoordSource) {
        this.gpsCoordsSource = gpsCoordSource;
    }

    public Integer getGpsCoordsPrecision() {
        return gpsCoordsPrecision;
    }

    public void setGpsCoordsPrecision(int gpsCoordPrecision) {
        this.gpsCoordsPrecision = gpsCoordPrecision;
    }

    public DateSpecifier getDateSpecifier() {
        return new DateSpecifier(date, datePrecision);
    }

    public void setDateSpecifier(DateSpecifier specifier) {
        this.date = specifier.getDate();
        this.datePrecision = specifier.getDatePrecision();
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public List<MapSquareNew> getMapSquares() {
        return mapSquares_legacy;
    }

    public void setMapSquares(List<MapSquareNew> mapSquares) {
        this.mapSquares_legacy = mapSquares;
    }

    public List<Herbarium> getHerbariums() {
        return herbariums;
    }

    public void setHerbariums(List<Herbarium> herbariums) {
        this.herbariums = herbariums;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public List<RecordComment> getComments() {
        return comments;
    }

    public void setComments(List<RecordComment> comments) {
        this.comments = comments;
    }

    public boolean hasUnresolvedComment() {
        for (RecordComment c : comments) {
            if (!c.isResolved() && !c.isDeleted())
                return true;
        }
        return false;
    }

    public boolean isHerbariumQuality() {
        return herbariumQuality;
    }

    public void setHerbariumQuality(boolean herbariumQuality) {
        this.herbariumQuality = herbariumQuality;
    }

    public String getOriginalId() {
        return originalId;
    }

    public void setOriginalId(String originalId) {
        this.originalId = originalId;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public String getRemarkExcerption() {
        return remarkExcerption;
    }

    public void setRemarkExcerption(String remarkExcerption) {
        this.remarkExcerption = remarkExcerption;
    }

    public String getRemarkOther() {
        return remarkOther;
    }

    public void setRemarkOther(String remarkOther) {
        this.remarkOther = remarkOther;
    }

    public String getRemarkDoubt() {
        return remarkDoubt;
    }

    public void setRemarkDoubt(String remarkDoubt) {
        this.remarkDoubt = remarkDoubt;
    }

    public boolean isIncludedInMap() {
        return includedInMap;
    }

    public void setIncludedInMap(boolean includeInMap) {
        this.includedInMap = includeInMap;
    }

    public Bibliography getBibliography() {
        return bibliography;
    }

    public void setBibliography(Bibliography bibliography) {
        this.bibliography = bibliography;
    }

    public RecordValidationStatus getValidationStatus() {
        return validationStatus;
    }

    public void setValidationStatus(RecordValidationStatus validationStatus) {
        this.validationStatus = validationStatus;
    }

    /**
     * Backward compatibility method - returns the ID of the validation status
     */
    public int getValidationStatusId() {
        return validationStatus != null ? validationStatus.getId() : 0;
    }

    /**
     * Backward compatibility method - sets validation status by ID
     * ID 0 represents UNPROCESSED status (not null)
     */
    public void setValidationStatusId(int validationStatusId) {
        if (validationStatusId == 0) {
            // UNPROCESSED status - create a new instance with ID 0
            this.validationStatus = new RecordValidationStatus();
            this.validationStatus.setId(0);
        } else {
            this.validationStatus = RecordValidationStatus.find().byId(validationStatusId);
        }
    }

    public String getDetrev() {
        return detrev;
    }

    public void setDetrev(String detrev) {
        this.detrev = detrev;
    }

    public Timestamp getLastEditTimestamp() {
        return lastEditTimestamp;
    }

    public void setLastEditTimestamp(Timestamp lastEditTimestamp) {
        this.lastEditTimestamp = lastEditTimestamp;
    }

    public RecordOriginalityStatus getOriginalityStatus() {
        return originalityStatus;
    }

    public void setOriginalityStatus(RecordOriginalityStatus originalityStatus) {
        this.originalityStatus = originalityStatus;
    }

    public void setOriginalityStatusById(int originalityStatusId) {
        this.originalityStatus = RecordOriginalityStatus.find().byId(originalityStatusId);
    }

    public boolean isLocked() {
        return locked;
    }

    public void setLocked(boolean locked) {
        this.locked = locked;
    }

    public License getLicense() {
        return license;
    }

    public void setLicense(License license) {
        this.license = license;
    }

    public NonVascularRecordExtension getNonVascularExtension() {
        if (nonVascularExtension == null) {
            nonVascularExtension = NonVascularRecordExtension.find().byId(id);
        }
        return nonVascularExtension;
    }

    public List<RecordHistory> getHistory() {
        return RecordHistory.find().query()
            .where()
            .eq("record_id", id)
            .orderBy("creation_timestamp asc")
            .findList();
    }

    public boolean hasHistory() {
        List<Object> ids = RecordHistory.find().query()
            .where()
            .eq("record_id", id).setMaxRows(1)
            .findIds();

        return !ids.isEmpty();
    }

    public boolean hasComment() {
        List<Object> ids = RecordComment.find().query()
            .where()
            .eq("record_id", id).setMaxRows(1)
            .findIds();

        return !ids.isEmpty();
    }

    /**
     * Uživatel smí se záznamem dělat vše
     */
    public boolean isUserElligibleToEditEverything(User user) {
        if (user == null)
            return false;

        if (user.isMapAdmin())
            return true;

        for (User supervisor : taxon.getSupervisors()) {
            if (user.equals(supervisor)) {
                return true;
            }
        }

        Taxon t = getTaxon();
        Set<Taxon> supervisedTaxons = user.getSupervisedTaxons();
        if (t.isDescendant(supervisedTaxons)) {
            return true;
        }

        return project.isManagedByUser(user);
    }

    /**
     * Uživatel smí záznam upravovat (nikoli semafor)
     */
    public boolean isUserElligibleToEditCommonFields(User user) {
        if (getBatch().getAuthor() == null) {
            //we have seen that Batch was not always properly populated
            getBatch().refresh();
        }

        if ((this.getValidationStatusId() == RecordValidationStatus.Unprocessed) &&
            (this.getBatch().getAuthor().equals(user) || this.getBatch().getCommitter().equals(user))
        ) {
            return true;
        }

        return isUserElligibleToEditEverything(user);
    }

    public boolean isEditationAllowed() {
        if (locked) {
            return false;
        }
        TaxonMapSettings settings = TaxonMapSettings.find().byId(taxon.getId());
        return settings == null || !settings.isLocked();
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof Record other))
            return false;

        return (id.longValue() == other.id.longValue());
    }

    @Override
    public int hashCode() {
        int val = 3571;
        if (id != null) {
            val = val * 193 + id.intValue();
        }
        return val;
    }
}

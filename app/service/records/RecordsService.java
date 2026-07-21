package service.records;

import geom.Coordinates;
import helpers.date.DateConverter;
import helpers.date.DateDescriptor;
import helpers.strings.StringNormalizer;
import io.ebean.DB;
import io.ebean.Transaction;
import models.*;
import models.Record;

import models.nonvascular.NonVascularRecordExtension;
import models.nonvascular.Substrate1;
import models.nonvascular.Substrate2;
import org.apache.commons.lang3.StringUtils;
import platform.ProjectConstants;
import play.i18n.Messages;
import service.config.IConfigService;
import service.phytochorion.PhytochorionService;
import utils.PhytoUtils;

import javax.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class RecordsService {

    protected final PhytochorionService phytochorionService;
    protected IConfigService configService;

    @Inject
    public RecordsService(PhytochorionService phytochorionService, IConfigService configService) {
        this.phytochorionService = phytochorionService;
        this.configService = configService;
    }

    // ==================== Field Update Operations ====================

    public void editField(User currentUser, Record record, String fieldKey, String newValue, Messages messages) throws Exception {
        if (!record.isUserElligibleToEditCommonFields(currentUser)) {
            throw new Exception("Not allowed to edit the record");
        }

        switch (fieldKey) {
            case "PHYTOCHORION":
                updatePhytochorion(currentUser, record, newValue, messages);
                break;
            case "LOCALITY":
                updateLocality(currentUser, record, newValue);
                break;
            case "TAXON":
                updateTaxon(currentUser, record, newValue, messages);
                break;
            case "ORIGINALNAME":
                updateOriginalName(currentUser, record, newValue);
                break;
            case "NEARESTTOWNNAME":
                updateNearestTownText(currentUser, record, newValue);
                break;
            case "ALTITUDEMIN":
                updateAltitude(currentUser, record, newValue, true, messages);
                break;
            case "ALTITUDEMAX":
                updateAltitude(currentUser, record, newValue, false, messages);
                break;
            case "ALTITUDEAPPROXIMATION":
                updateAltitudeApproximation(currentUser, record, newValue, messages);
                break;
            case "IMPORTCOMMENT":
                updateImportComment(currentUser, record, newValue);
                break;
            case "COORDSPRECISION":
                updateCoordsPrecision(currentUser, record, newValue, messages);
                break;
            case "DATE":
                updateDatum(currentUser, record, newValue, messages);
                break;
            case "ADDFINDER":
                addFinder(currentUser, record, newValue, messages);
                break;
            case "DELETEFINDER":
                deleteFinder(currentUser, record, newValue);
                break;
            case "ADDHERBARIUM":
                addHerbarium(currentUser, record, newValue, messages);
                break;
            case "DELETEHERBARIUM":
                deleteHerbarium(currentUser, record, newValue);
                break;
            case "SOURCE":
                updateSource(currentUser, record, newValue);
                break;
            case "ORIGINALID":
                updateOriginalId(currentUser, record, newValue, messages);
                break;
            case "SUBSTRATE":
                updateDaliborSustrateText(currentUser, record, newValue);
                record.getNonVascularExtension().update();
                break;
            case "CHEMICAL":
                updateDaliborChemical(currentUser, record, newValue);
                record.getNonVascularExtension().update();
                break;
            case "SUBSTRATE2":
                updateDaliborSubstrate2(currentUser, record, newValue);
                record.getNonVascularExtension().update();
                break;
            case "LOCALITYEXTRA":
                updateDaliborLocalityExtra(currentUser, record, newValue);
                record.getNonVascularExtension().update();
                break;
            case "VALIDATION_STATUS":
            case "ORIGINALITY_STATUS":
            case "HERBARIUM_QUALITY":
            case "INCLUDED_IN_MAP":
            case "ENVIRONMENT":
            case "DETREV":
            case "REMARK_EXCERPTION":
            case "REMARK_OTHER":
            case "REMARK_DOUBT":
                if (!isElligibleForRecordValidation(currentUser, record)) {
                    throw new Exception(messages.at("RecordEditController.notEligibleForRecordValidation"));
                }
                switch (fieldKey) {
                    case "VALIDATION_STATUS":
                        updateValidationStatus(currentUser, record, newValue, messages);
                        break;
                    case "ORIGINALITY_STATUS":
                        updateOriginalityStatus(currentUser, record, newValue, messages);
                        break;
                    case "HERBARIUM_QUALITY":
                        updateHerbariumQuality(currentUser, record, newValue);
                        break;
                    case "INCLUDED_IN_MAP":
                        updateIncludedInMap(currentUser, record, newValue, messages);
                        break;
                    case "ENVIRONMENT":
                    case "DETREV":
                    case "REMARK_EXCERPTION":
                    case "REMARK_OTHER":
                    case "REMARK_DOUBT":
                        updateTextField(currentUser, record, fieldKey, newValue);
                        break;
                }
                break;

            default:
                throw new IllegalArgumentException(messages.at("RecordEditController.unableToUpdateField", fieldKey));
        }
        updateTaxonEditCount(currentUser, record.getTaxon());
        record.update();
    }

    private void addFinder(User currentUser, Record record, String newValue, Messages messages) throws Exception {
        int finderId = Integer.parseInt(newValue);
        Author newFinder = Author.findById(finderId);
        if (newFinder == null) {
            return;
        }

        if (record.getAuthorsSorted().contains(newFinder)) {
            throw new Exception(messages.at("RecordEditController.finderAlreadyRegistered", newFinder.toString()));
        }

        buildRecordAuthorEntry(record, newFinder);
        saveRecordHistory(currentUser, record.getId(), "author", "", newFinder.toString(), RecordChangeType.DESCRIPTION);
    }

    private void buildRecordAuthorEntry(Record record, Author newFinder) {
        RecordAuthor ra = new RecordAuthor();
        ra.setAuthor(newFinder);
        ra.setRecord(record);
        int newSuccession = 1;
        var iter = RecordAuthor.find().query().where()
            .conjunction()
            .eq("id.recordId", record.getId())
            .gt("succession", 0)
            .endJunction()
            .orderBy("succession desc").findIterate();
        if (iter.hasNext()) {
            RecordAuthor last = iter.next();
            newSuccession = (last.getSuccession() != null ? last.getSuccession() + 1 : 1);
        }
        iter.close();
        ra.setSuccession(newSuccession);
        record.getRecordAuthors().add(ra);
        ra.save();
    }

    private void deleteFinder(User currentUser, Record record, String newValue) {
        int finderId = Integer.parseInt(newValue);
        Author finderToRemove = Author.findById(finderId);
        if (finderToRemove != null) {
            List<RecordAuthor> raList = record.getRecordAuthors();
            for (RecordAuthor ra : raList) {
                if (ra.getAuthor().equals(finderToRemove)) {
                    raList.remove(ra);
                    DB.delete(ra);
                    saveRecordHistory(currentUser, record.getId(), "author", finderToRemove.toString(), "", RecordChangeType.DESCRIPTION);
                    break;
                }
            }
        }
    }

    private void addHerbarium(User currentUser, Record record, String newValue, Messages messages) throws Exception {
        int herbariumId = Integer.parseInt(newValue);
        Herbarium newHerbarium = Herbarium.find().byId(herbariumId);
        if (newHerbarium == null) {
            return;
        }

        if (record.getHerbariums().contains(newHerbarium)) {
            throw new Exception(messages.at("RecordEditController.herbariumAlreadyRegistered", newHerbarium.getName()));
        }

        record.getHerbariums().add(newHerbarium);
        saveRecordHistory(currentUser, record.getId(), "herbarium", "", newHerbarium.getName(), RecordChangeType.DESCRIPTION);
    }

    private void deleteHerbarium(User currentUser, Record record, String newValue) {
        int herbariumId = Integer.parseInt(newValue);
        List<Herbarium> herbariums = record.getHerbariums();
        for (int i = 0; i < herbariums.size(); i++) {
            Herbarium h = herbariums.get(i);
            Integer hId = h.getId();
            if (hId != null && hId == herbariumId) {
                herbariums.remove(i);
                saveRecordHistory(currentUser, record.getId(), "herbarium", h.getName(), "", RecordChangeType.DESCRIPTION);

                if (herbariums.isEmpty() && record.isHerbariumQuality()) {
                    record.setHerbariumQuality(false);
                    saveRecordHistory(currentUser, record.getId(), "herbarium_quality", Boolean.TRUE.toString(), Boolean.FALSE.toString(), RecordChangeType.DESCRIPTION);
                }
                return;
            }
        }
    }

    private void updatePhytochorion(User currentUser, Record record, String newValue, Messages messages) {
        if (record.getPhytochorion() != null)
            record.getPhytochorion().refresh();

        String oldValue = (record.getPhytochorion() != null) ? record.getPhytochorion().toString() : "";

        Phytochorion newPhyto = Phytochorion.find().byId(Integer.parseInt(newValue));

        if (newPhyto == null)
            throw new IllegalArgumentException(messages.at("RecordEditController.invalidPhytoId"));

        record.setPhytochorion(newPhyto);
        saveRecordHistory(currentUser, record.getId(), "phytochorion_id", oldValue, newPhyto.toString(), RecordChangeType.DESCRIPTION);
    }

    private void updateLocality(User currentUser, Record record, String newValue) {
        String oldValue = StringUtils.isBlank(record.getLocality()) ? "" : record.getLocality();
        record.setLocality(newValue);
        saveRecordHistory(currentUser, record.getId(), "locality", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateTaxon(User currentUser, Record record, String newValue, Messages messages) {
        String oldValue = record.getTaxon().getNameLat();
        Taxon taxon = Taxon.find().byId(Long.parseLong(newValue));

        if (taxon == null) {
            throw new IllegalArgumentException(messages.at("RecordEditController.invalidTaxonId"));
        }

        record.setTaxon(taxon);
        saveRecordHistory(currentUser, record.getId(), "taxon", oldValue, taxon.getNameLat(), RecordChangeType.TAXON);
    }

    private void updateOriginalName(User currentUser, Record record, String newValue) {
        String oldValue = StringUtils.isBlank(record.getOriginalName()) ? "" : record.getOriginalName();
        record.setOriginalName(newValue);
        saveRecordHistory(currentUser, record.getId(), "original_name", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateNearestTownText(User currentUser, Record record, String newValue) {
        String oldValue = StringUtils.isBlank(record.getNearestTownText()) ? "" : record.getNearestTownText();
        record.setNearestTownText(newValue);
        saveRecordHistory(currentUser, record.getId(), "nearest_town_text", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateDatum(User currentUser, Record record, String newValue, Messages messages) {
        String oldValue = record.getDateSpecifier() != null ? record.getDateSpecifier().toString() : "";
        DateDescriptor desc = DateConverter.toDate(newValue, messages);
        DateSpecifier dateSpec = DateSpecifier.createFromDateDescriptor(desc);
        record.setDateSpecifier(dateSpec);
        saveRecordHistory(currentUser, record.getId(), "datum", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateAltitude(User currentUser, Record record, String newValue, boolean isMinValue, Messages messages) throws Exception {
        String oldValue;
        String fieldDesc;
        Integer altitude;
        int minEnabledAltitude = configService.getInteger(ProjectConstants.CheckMinAltitudeKey);
        int maxEnabledAltitude = configService.getInteger(ProjectConstants.CheckMaxAltitudeKey);

        if (StringUtils.isBlank(newValue)) {
            // Empty string means set to NULL
            altitude = null;
        } else {
            try {
                altitude = Integer.parseInt(newValue);
            } catch (NumberFormatException e) {
                throw new Exception(messages.at("RecordEditController.invalidIntegerValue", newValue));
            }

            if (altitude < minEnabledAltitude || altitude > maxEnabledAltitude) {
                throw new Exception(messages.at("RecordEditController.valueOutOfRange", minEnabledAltitude, maxEnabledAltitude));
            }
        }

        if (isMinValue) {
            if (altitude != null && record.getAltitudeMax() != null && record.getAltitudeMax() < altitude) {
                throw new Exception(messages.at("RecordEditController.valueOutOfRange", minEnabledAltitude, record.getAltitudeMax()));
            }
            oldValue = record.getAltitudeMin() != null ? record.getAltitudeMin().toString() : "";
            fieldDesc = "altitude_min";
            record.setAltitudeMin(altitude);
        } else {
            if (altitude != null && record.getAltitudeMin() != null && record.getAltitudeMin() > altitude) {
                throw new Exception(messages.at("RecordEditController.valueOutOfRange", record.getAltitudeMin(), maxEnabledAltitude));
            }
            oldValue = record.getAltitudeMax() != null ? record.getAltitudeMax().toString() : "";
            fieldDesc = "altitude_max";
            record.setAltitudeMax(altitude);
        }

        saveRecordHistory(currentUser, record.getId(), fieldDesc, oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateImportComment(User currentUser, Record record, String newValue) {
        String oldValue = record.getComment() == null ? "" : record.getComment();
        record.setComment(newValue);
        saveRecordHistory(currentUser, record.getId(), "import_comment_edit", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateCoordsPrecision(User currentUser, Record record, String newValue, Messages messages) {
        if (!record.hasCoords()) {
            throw new IllegalArgumentException(messages.at("RecordEditController.cannotSetCoordsPrecisionForRecordWithNoCoords"));
        }

        String oldValue = record.getGpsCoordsPrecision() == null ? "" : record.getGpsCoordsPrecision().toString();

        int newPrecision;
        try {
            newPrecision = Integer.parseInt(newValue);
        } catch (Exception e) {
            throw new IllegalArgumentException(messages.at("RecordEditController.invalidCoordsPrecision"));
        }
        record.setGpsCoordsPrecision(newPrecision);
        saveRecordHistory(currentUser, record.getId(), "coords_precision", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateAltitudeApproximation(User currentUser, Record record, String newValue, Messages messages) {
        String oldValue = record.isAltitudeApproximation() == null ? "" : record.isAltitudeApproximation().toString();

        boolean newApprox;
        try {
            newApprox = Boolean.parseBoolean(newValue);
        } catch (Exception e) {
            throw new IllegalArgumentException(messages.at("RecordEditController.invalidAltitudeApproximation"));
        }
        record.setAltitudeApproximation(newApprox);
        saveRecordHistory(currentUser, record.getId(), "altitude_approx", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateSource(User currentUser, Record record, String newValue) {
        String oldValue = StringUtils.isBlank(record.getSource()) ? "" : record.getSource();
        record.setSource(newValue);
        saveRecordHistory(currentUser, record.getId(), "source", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateOriginalId(User currentUser, Record record, String newValue, Messages messages) {
        if (record.getProject().getId() != Project.AtlasExcerptionProjectId) {
            throw new IllegalArgumentException(messages.at("RecordEditController.originalIdNotEditable"));
        }
        String oldValue = StringUtils.isBlank(record.getOriginalId()) ? "" : record.getOriginalId();
        record.setOriginalId(newValue);
        saveRecordHistory(currentUser, record.getId(), "original_id", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateDaliborSustrateText(User currentUser, Record record, String newValue) {
        String oldValue = StringUtils.isBlank(record.getNonVascularExtension().getSubstrate()) ? "" : record.getNonVascularExtension().getSubstrate();
        record.getNonVascularExtension().setSubstrate(newValue);
        saveRecordHistory(currentUser, record.getId(), "substrate", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateDaliborSubstrate2(User currentUser, Record record, String newValue) {
        NonVascularRecordExtension recordExt = record.getNonVascularExtension();
        String oldValue = recordExt.getSubstrateCategoryText();

        long substKey = Long.parseLong(newValue);
        Substrate2 substrate2 = Substrate2.find().byId(substKey);
        recordExt.setSubstrate2(substrate2);

        Substrate1 substrate1 = Substrate1.find().byId(substrate2.getSubstrate1Id());
        recordExt.setSubstrate1(substrate1);

        String newValueText = recordExt.getSubstrateCategoryText();
        saveRecordHistory(currentUser, record.getId(), "substrate_category", oldValue, newValueText, RecordChangeType.DESCRIPTION);
    }

    private void updateDaliborChemical(User currentUser, Record record, String newValue) {
        String oldValue = StringUtils.isBlank(record.getNonVascularExtension().getChemical()) ? "" : record.getNonVascularExtension().getChemical();
        record.getNonVascularExtension().setChemical(newValue);
        saveRecordHistory(currentUser, record.getId(), "chemical", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateDaliborLocalityExtra(User currentUser, Record record, String newValue) {
        String oldValue = StringUtils.isBlank(record.getNonVascularExtension().getLocalityExtra()) ? "" : record.getNonVascularExtension().getLocalityExtra();
        record.getNonVascularExtension().setLocalityExtra(newValue);
        saveRecordHistory(currentUser, record.getId(), "locality_extra", oldValue, newValue, RecordChangeType.DESCRIPTION);
    }

    private void updateValidationStatus(User currentUser, Record record, String newValue, Messages messages) throws Exception {
        Integer newStatus = Integer.parseInt(newValue);
        RecordValidationStatus oldStatus = record.getValidationStatus();
        RecordValidationStatus newValidationStatus = RecordValidationStatus.find().byId(newStatus);

        record.setValidationStatusId(newStatus);

        // Collect history entries
        List<RecordHistory> histories = new ArrayList<>();
        histories.add(RecordHistory.build(record.getId(), currentUser,
            RecordChangeType.FLAG, "validation_status",
            oldStatus.getDescription(), newValidationStatus.getDescription()));

        // Cascading logic based on new validation status
        if (newStatus == RecordValidationStatus.Unprocessed) {
            // Reset originality, herbarium quality, and include_in_map
            if (record.getOriginalityStatus().getId() != RecordOriginalityStatus.Undefined) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "originality", record.getOriginalityStatus().getName(), "NULL"));
                record.setOriginalityStatusById(RecordOriginalityStatus.Undefined);
            }
            if (record.isHerbariumQuality()) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "herbarium_quality", Boolean.TRUE.toString(), Boolean.FALSE.toString()));
                record.setHerbariumQuality(false);
            }
            if (record.isIncludedInMap()) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "include_in_map", Boolean.TRUE.toString(), Boolean.FALSE.toString()));
                record.setIncludedInMap(false);
            }
        }

        if (newStatus == RecordValidationStatus.Accepted) {
            // Auto-set include_in_map to true if not already
            if (!record.isIncludedInMap()) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "include_in_map", Boolean.FALSE.toString(), Boolean.TRUE.toString()));
                record.setIncludedInMap(true);
            }

            // Auto-set herbarium_quality to true if conditions met
            if (!record.isHerbariumQuality() && !record.getHerbariums().isEmpty() &&
                record.getBatch().getAuthor().getId().equals(currentUser.getId())) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "herbarium_quality", Boolean.FALSE.toString(), Boolean.TRUE.toString()));
                record.setHerbariumQuality(true);
            }
        }

        if (newStatus == RecordValidationStatus.Declined || newStatus == RecordValidationStatus.Uncertain) {
            // Set include_in_map to false if currently true
            if (record.isIncludedInMap()) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "include_in_map", Boolean.TRUE.toString(), Boolean.FALSE.toString()));
                record.setIncludedInMap(false);
            }

            // Reset originality if was previously Accepted and not Undefined
            if (oldStatus.getId() == RecordValidationStatus.Accepted &&
                record.getOriginalityStatus().getId() != RecordOriginalityStatus.Undefined) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "originality", record.getOriginalityStatus().getName(), "NULL"));
                record.setOriginalityStatusById(RecordOriginalityStatus.Undefined);
            }
        }

        // Save all history entries
        for (RecordHistory rh : histories) {
            rh.save();
        }
    }

    private void updateOriginalityStatus(User currentUser, Record record, String newValue, Messages messages) throws Exception {
        Integer newOriginality = Integer.parseInt(newValue);
        RecordOriginalityStatus oldOriginality = record.getOriginalityStatus();

        // Validate that validation_status is Accepted
        if (record.getValidationStatusId() != RecordValidationStatus.Accepted) {
            throw new Exception(messages.at("Atlas.recordNotMarkedAsReliable"));
        }

        List<RecordHistory> histories = new ArrayList<>();

        record.setOriginalityStatusById(newOriginality);

        // Add originality change history
        histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG, "originality",
            oldOriginality.getName(), RecordOriginalityStatus.find().byId(newOriginality).getName()));

        // Cascading logic for Cultivated status
        if (newOriginality == RecordOriginalityStatus.Cultivated) {
            if (record.isIncludedInMap()) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "include_in_map", Boolean.TRUE.toString(), Boolean.FALSE.toString()));
                record.setIncludedInMap(false);
            }
        }

        // When changing FROM Cultivated TO Original or Unoriginal
        if (oldOriginality.getId() == RecordOriginalityStatus.Cultivated &&
            (newOriginality == RecordOriginalityStatus.Original || newOriginality == RecordOriginalityStatus.Unoriginal)) {
            if (!record.isIncludedInMap()) {
                histories.add(RecordHistory.build(record.getId(), currentUser, RecordChangeType.FLAG,
                    "include_in_map", Boolean.FALSE.toString(), Boolean.TRUE.toString()));
                record.setIncludedInMap(true);
            }
        }

        // Save all history entries
        for (RecordHistory rh : histories) {
            rh.save();
        }
    }

    private void updateHerbariumQuality(User currentUser, Record record, String newValue) {
        Boolean newHerbQuality = Boolean.parseBoolean(newValue);
        Boolean oldHerbQuality = record.isHerbariumQuality();
        record.setHerbariumQuality(newHerbQuality);
        saveRecordHistory(currentUser, record.getId(), "herbarium_quality", oldHerbQuality.toString(),
            newHerbQuality.toString(), RecordChangeType.FLAG);
    }

    private void updateIncludedInMap(User currentUser, Record record, String newValue, Messages messages) throws Exception {
        Boolean newIncluded = Boolean.parseBoolean(newValue);
        Boolean oldIncluded = record.isIncludedInMap();

        // Validate: cannot set to true if validation_status is Declined or Unprocessed
        if (newIncluded &&
            (record.getValidationStatusId() == RecordValidationStatus.Declined ||
                record.getValidationStatusId() == RecordValidationStatus.Unprocessed)) {
            throw new Exception(messages.at("Atlas.declinedOrUnprocessedRecordCannotBeIncludedInMap"));
        }

        record.setIncludedInMap(newIncluded);
        saveRecordHistory(currentUser, record.getId(), "include_in_map", oldIncluded.toString(),
            newIncluded.toString(), RecordChangeType.FLAG);
    }

    private void updateTextField(User currentUser, Record record, String field, String value) {
        String oldValue = getTextFieldValue(record, field);
        String normalizedValue = StringNormalizer.normalizeSpaces(value);
        setTextFieldValue(record, field, normalizedValue);
        saveRecordHistory(currentUser, record.getId(), field.toLowerCase(), oldValue,
            normalizedValue, RecordChangeType.DESCRIPTION);
    }

    private String getTextFieldValue(Record record, String field) {
        return switch (field) {
            case "ENVIRONMENT" -> record.getEnvironment();
            case "DETREV" -> record.getDetrev();
            case "REMARK_EXCERPTION" -> record.getRemarkExcerption();
            case "REMARK_OTHER" -> record.getRemarkOther();
            case "REMARK_DOUBT" -> record.getRemarkDoubt();
            default -> null;
        };
    }

    private void setTextFieldValue(Record record, String field, String value) {
        switch (field) {
            case "ENVIRONMENT" -> record.setEnvironment(value);
            case "DETREV" -> record.setDetrev(value);
            case "REMARK_EXCERPTION" -> record.setRemarkExcerption(value);
            case "REMARK_OTHER" -> record.setRemarkOther(value);
            case "REMARK_DOUBT" -> record.setRemarkDoubt(value);
        }
    }

    // ==================== Move Record Operations ====================

    public MoveRecordResult moveRecordCoords(Record record, User currentUser, double latitude, double longitude, int gpsPrecision, long timestamp, Messages messages) {
        // Check timestamp for conflict detection
        if (timestamp < record.getLastEditTimestamp().getTime()) {
            return new MoveRecordResult(false, "", 0L, false, 0L, messages.at("RecordEditController.newVersionRecordExists"));
        }

        // Determine new coords source
        String newCoordsSource = record.hasCoords()
            ? messages.at("RecordEditController.gpsCoordsSpecifiedInPladias")
            : messages.at("RecordEditController.gpsCoordsEnteredInPladias");

        Coordinates newCoords = Coordinates.of(longitude, latitude);
        District newDistrict = District.findDistrictByPoint(newCoords);
        if (newDistrict == null) {
            return new MoveRecordResult(false, "", 0L, false, 0L, messages.at("RecordEditController.gpsCoordsOutOfRange"));
        }

        // Store old values for history
        double oldLat = record.getLatitude() != null ? record.getLatitude() : 0;
        double oldLng = record.getLongitude() != null ? record.getLongitude() : 0;
        int oldPrecision = record.getGpsCoordsPrecision() != null ? record.getGpsCoordsPrecision() : 0;
        String oldCoordsSource = record.getGpsCoordSource() != null ? record.getGpsCoordSource() : "";

        // Update record with new values
        record.setLatitude(latitude);
        record.setLongitude(longitude);
        record.setGpsCoordsPrecision(gpsPrecision);
        record.setGpsCoordSource(newCoordsSource);
        record.setDistrict(newDistrict);

        // Update remark doubts (clear automatic messages)
        updateRemarkDoubts(record, messages);

        // Build history entries
        List<RecordHistory> histories = new ArrayList<>();

        // Update phytochorion history
        boolean phytochorionChanged = updatePhytochorionHistory(record, newCoords, histories, currentUser);

        // Add coordinate change history
        histories.add(RecordHistory.build(
            record.getId(), currentUser, RecordChangeType.LOCATION, "gps",
            String.format(Locale.US, "(%f, %f)", oldLat, oldLng),
            String.format(Locale.US, "(%f, %f)", latitude, longitude)
        ));

        // Add precision change history if changed
        if (oldPrecision != gpsPrecision) {
            histories.add(RecordHistory.build(
                record.getId(), currentUser, RecordChangeType.LOCATION, "coords_precision",
                Integer.toString(oldPrecision),
                Integer.toString(gpsPrecision)
            ));
        }

        // Add coords source change history if changed
        if (!oldCoordsSource.equals(newCoordsSource)) {
            histories.add(RecordHistory.build(
                record.getId(), currentUser, RecordChangeType.LOCATION, "coords_source",
                oldCoordsSource, newCoordsSource
            ));
        }

        try (Transaction transaction = DB.beginTransaction()) {
            record.update();
            for (RecordHistory rh : histories) {
                rh.save();
            }
            transaction.commit();

            return new MoveRecordResult(true, newCoordsSource, record.getId(), phytochorionChanged, record.getLastEditTimestamp().getTime(), null);
        } catch (Exception e) {
            return new MoveRecordResult(false, "", 0L, false, 0L, messages.at("RecordEditController.unableToUpdateCoords"));
        }
    }

    private boolean updatePhytochorionHistory(Record record, Coordinates newCoords,
                                              List<RecordHistory> histories, User currentUser) {
        Phytochorion oldPhyto = record.getPhytochorion();
        Phytochorion newPhyto = phytochorionService.findByPoint(newCoords);
        boolean oldPhytochorionComputed = record.isPhytochorionComputed();

        if (PhytoUtils.areEqual(oldPhyto, newPhyto)) {
            return false;
        }

        record.setPhytochorion(newPhyto);
        histories.add(RecordHistory.build(
            record.getId(), currentUser, RecordChangeType.DESCRIPTION, "phytochorion_id",
            oldPhyto == null ? "" : oldPhyto.toString(),
            newPhyto.toString()
        ));

        if (!oldPhytochorionComputed) {
            histories.add(RecordHistory.build(
                record.getId(), currentUser, RecordChangeType.LOCATION, "phytochorion_computed",
                Boolean.toString(oldPhytochorionComputed),
                Boolean.toString(true)
            ));
            record.setPhytochorionComputed(true);
        }

        return true;
    }

    private void updateRemarkDoubts(Record record, Messages messages) {
        String doubts = record.getRemarkDoubt();
        if (doubts == null || doubts.trim().isEmpty()) {
            return;
        }

        String[] texts = new String[]{
            messages.at("RecordEditController.districtComputedAutomatically"),
            messages.at("RecordEditController.incorrectLocalization"),
            messages.at("RecordEditController.phytochorionGrosslyOutOfSyncWithCoords"),
            messages.at("RecordEditController.quadrantOutOfSyncWithDistrict"),
            messages.at("RecordEditController.phytochorionOutOfSyncWithDistrict")
        };

        for (String message : texts) {
            doubts = doubts.replace(message, "");
        }
        record.setRemarkDoubt(doubts.trim());
    }

    private void saveRecordHistory(User currentUser, long recordId,
                                   String fieldDesc, String oldValue, String newValue, RecordChangeType changeType) {
        // Skip history if old and new values are equal (no actual change)
        if (StringUtils.equals(oldValue, newValue)) {
            return;
        }
        RecordHistory history = RecordHistory.build(recordId, currentUser, changeType, fieldDesc, oldValue, newValue);
        history.save();
    }

    // ==================== Helper Methods

    private void updateTaxonEditCount(User currentUser, Taxon taxon) {
        TaxonMapSettings settings = TaxonMapSettings.find().byId(taxon.getId());
        if (settings == null) return;
        settings.incrementEditCount();
        settings.update();
    }

    //TODO - tyhle dvě metody by neměly být tady ale v nějaké třídě obecně dostupné..
    private boolean isSupervised(models.Taxon t, User user) {
        if (t == null || user == null) return false;
        return user.getSupervisedTaxons().contains(t);
    }

    private boolean isElligibleForRecordValidation(User user, Record record) {
        return user.isMapAdmin() || isSupervised(record.getTaxon(), user);
    }

    public record MoveRecordResult(boolean success, String coordsSource, Long recordId, boolean phytochorionComputed,
                                   long timestamp, String errorMessage) {

        public boolean hasError() {
            return errorMessage != null;
        }
    }

}

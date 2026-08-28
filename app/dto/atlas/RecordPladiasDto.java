package dto.atlas;

import comparators.AuthorsEtAliiComparator;
import dto.selectItems.HerbariumOptionDto;
import models.Record;
import models.RecordValidationStatus;
import models.Taxon;
import models.User;
import models.nonvascular.NonVascularRecordExtension;
import utils.ConfigHelper;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Comprehensive DTO for PLADIAS Record information.
 * Contains all record-related fields including relationships:
 * - Basic info: id, coordinates, year, altitude, locality
 * - Validation: status, originality, remarks, comments
 * - Authors: collectors, batch author/committer
 * - Location: district, nearest town, phytochorion, quadrant, square
 * - Herbarium: herbaria list, herbarium quality flag
 * - Metadata: source, license, project, GPS precision/source, dates
 * - Taxon: taxonId, taxonNameLat, taxonNameHtml
 */
public record RecordPladiasDto(
    // Basic identification
    Long id,
    String taxonOriginal,

    // Taxon information
    Long taxonId,
    String taxonNameLat,
    String taxonNameHtml,

    // Coordinates and precision
    Double latitude,
    Double longitude,
    Integer gpsPrecision,
    String gpsCoordsSource,

    // Date information
    Integer year,
    String datePrecision,
    String dateIso,

    // Validation status
    Integer validationStatusId,
    String validationStatusColor,
    String validationStatusDescription,

    // Originality status
    Integer originalityStatusId,
    String originalityStatusName,
    String originalityStatusIcon,

    // Authors and collectors
    Long batchAuthorId,
    String batchAuthorName,
    Long batchCommitterId,
    String batchCommitterName,
    String recordAuthorsNames,  // Prerendered concatenated author names

    // Location information
    String computedQuadrantCode,
    String computedSquareCode,
    Long districtId,
    String districtName,
    Long nearestTownId,
    String nearestTownName,
    String nearestTownText,
    String phytochorionPhytoId,
    String phytochorionName,
    Boolean isPhytochorionComputed,
    String quadrantsCodes,  // Prerendered concatenated legacy squares and quadrant codes (e.g., "5252a, 5252b")

    // Altitude
    Integer altitudeMin,
    Integer altitudeMax,
    Boolean altitudeApproximation,

    // Locality and environment
    String locality,
    String environment,
    String detrev,

    // Nonvascular-specific fields
    String substrate,
    String chemical,
    String localityExtra,
    String substrateCategoryText,

    // Remarks and comments
    String comment,
    String remarkExcerption,
    String remarkOther,
    String remarkDoubt,
    Integer unresolvedCommentsCount,
    List<CommentDto> comments,

    // Herbarium information
    List<HerbariumOptionDto> herbariums,
    Boolean herbariumQuality,

    // Source and licensing
    String source,
    String originalId,
    Long licenseId,
    String licenseName,

    // Project information
    Long projectId,
    String projectName,
    String institutionName,

    // Record flags
    Boolean locked,
    Boolean includedInMap,
    Boolean hasHistory,

    // Timestamps
    Timestamp lastEditTimestamp,
    Timestamp createTimestamp,

    // Edit permission
    Boolean canEdit
) {
    /**
     * Create a comprehensive DTO from a Record entity with edit permission check.
     * Allows including computed quadrant and square code from coordinates alongside legacy relation values.
     *
     * @param record      the record to convert
     * @param currentUser the current user (null if not authenticated)
     */
    public static RecordPladiasDto fromRecord(Record record, User currentUser, String computedQuadrantCode, String computedSquareCode, Boolean disableEditing) {
        return fromRecord(record, currentUser, computedQuadrantCode, computedSquareCode, disableEditing, null);
    }

    /**
     * Create a comprehensive DTO from a Record entity with edit permission check.
     * Allows including computed quadrant and square code from coordinates alongside legacy relation values.
     *
     * @param record                the record to convert
     * @param currentUser           the current user (null if not authenticated)
     * @param computedQuadrantCode  the computed quadrant code (can be null)
     * @param computedSquareCode    the computed square code (can be null)
     * @param disableEditing        whether to disable editing
     * @param precomputedHasHistory pre-computed hasHistory value to avoid N+1 queries (null to use record.hasHistory())
     */
    public static RecordPladiasDto fromRecord(Record record, User currentUser, String computedQuadrantCode, String computedSquareCode, Boolean disableEditing, Boolean precomputedHasHistory) {
        // Get year from date specifier
        Integer year = record.getDateSpecifier() != null
            ? record.getDateSpecifier().getYear()
            : null;

        // Get date precision
        String datePrecision = record.getDateSpecifier() != null
            ? record.getDateSpecifier().getDatePrecision()
            : null;

        // Get ISO format date with precision
        String dateIso = record.getDateSpecifier() != null
            ? record.getDateSpecifier().toString()
            : null;


        // Get validation status
        RecordValidationStatus validationStatus = record.getValidationStatus();
        Integer validationStatusId = record.getValidationStatusId();
        String validationStatusColor = validationStatus != null
            ? validationStatus.getColor()
            : null;
        String validationStatusDescription = validationStatus != null
            ? validationStatus.getDescription()
            : null;

        // Get originality status
        var originalityStatus = record.getOriginalityStatus();
        Integer originalityStatusId = originalityStatus != null
            ? originalityStatus.getId()
            : null;
        String originalityStatusName = originalityStatus != null
            ? originalityStatus.getName()
            : null;
        String originalityStatusIcon = originalityStatus != null
            ? originalityStatus.getIcon()
            : null;

        // Get GPS precision and source
        Integer gpsPrecision = record.getGpsCoordsPrecision();
        String gpsCoordsSource = record.getGpsCoordSource();

        // Get district info
        Long districtId = null;
        String districtName = null;
        var district = record.getDistrict();
        if (district != null) {
            districtId = district.getId();
            districtName = district.getName();
        }

        // Get nearest town info
        Long nearestTownId = null;
        String nearestTownName = null;
        String nearestTownText = record.getNearestTownText();
        var nearestTown = record.getNearestTownLegacy();
        if (nearestTown != null) {
            nearestTownId = nearestTown.getId();
            nearestTownName = nearestTown.getName();
        }

        // Get phytochorion info
        String phytochorionPhytoId = null;
        String phytochorionName = null;
        Boolean isPhytochorionComputed = null;
        var phytochorion = record.getPhytochorion();
        if (phytochorion != null) {
            phytochorionPhytoId = phytochorion.getPhytoId();
            phytochorionName = phytochorion.getName();
            isPhytochorionComputed = record.isPhytochorionComputed();
        }

        // Get project info
        Long projectId = null;
        String projectName = null;
        var project = record.getProject();
        if (project != null) {
            projectId = project.getId();
            projectName = project.getName();
        }

        // Get batch author and committer
        Long batchAuthorId = null;
        String batchAuthorName = null;
        Long batchCommitterId = null;
        String batchCommitterName = null;
        var batch = record.getBatch();
        if (batch != null) {
            User batchAuthor = batch.getAuthor();
            if (batchAuthor != null) {
                batchAuthorId = batchAuthor.getId();
                batchAuthorName = batchAuthor.getFullname();
            }
            User batchCommitter = batch.getCommitter();
            if (batchCommitter != null) {
                batchCommitterId = batchCommitter.getId();
                batchCommitterName = batchCommitter.getFullname();
            }
        }

        // Get herbarium information
        List<HerbariumOptionDto> herbariums = record.getHerbariums() != null
            ? record.getHerbariums().stream()
            .map(HerbariumOptionDto::fromHerbarium)
            .collect(Collectors.toList())
            : List.of();

        // Get comments information
        List<CommentDto> comments = record.getComments() != null
            ? record.getComments().stream()
            .filter(c -> !c.isDeleted() && !c.isResolved())
            .map(c -> new CommentDto(
                c.getId(),
                c.getAuthor() != null ? c.getAuthor().getId() : null,
                c.getAuthor() != null ? c.getAuthor().getFullname() : null,
                c.getMessage(),
                c.getCreateTimestamp(),
                c.isResolved(),
                c.isDeleted(),
                currentUser != null && c.isLinkedForUser(currentUser.getId())
            ))
            .collect(Collectors.toList())
            : List.of();

        // Count unresolved comments
        Integer unresolvedCommentsCount = (int) record.getComments().stream()
            .filter(c -> !c.isResolved() && !c.isDeleted())
            .count();

        // Get license info
        Long licenseId = null;
        String licenseName = null;
        var license = record.getLicense();
        if (license != null) {
            licenseId = (long) license.getId();
            licenseName = license.getKey();
        }

        // Get altitude approximation
        Boolean altitudeApproximation = record.isAltitudeApproximation();

        // Get taxon original name
        String taxonOriginal = record.getOriginalName();

        // Get taxon information
        Long taxonId = null;
        String taxonNameLat = null;
        String taxonNameHtml = null;
        Taxon taxon = record.getTaxon();
        if (taxon != null) {
            taxonId = taxon.getId();
            taxonNameLat = taxon.getNameLat();
            taxonNameHtml = taxon.getNameHtml();
        }

        // Get institution name
        String institutionName = project != null && project.getInstitution() != null
            ? project.getInstitution().getName()
            : null;

        // Check if record has history (changes)
        Boolean hasHistory = precomputedHasHistory != null ? precomputedHasHistory : record.hasHistory();

        // Get prerendered record authors names (comma concatenated, sorted using AuthorsEtAliiComparator)
        String recordAuthorsNames = record.getRecordAuthors() != null && !record.getRecordAuthors().isEmpty()
            ? record.getRecordAuthors().stream()
            .sorted(new AuthorsEtAliiComparator())
            .map(q -> {
                String surname = q.getAuthor().getSurname(); // has to be present to overcome lazyloading
                String name = q.getAuthor() != null ? q.getAuthor().toString() : "";
                return name;
            })
            .collect(Collectors.joining(", "))
            : null;

        // Get prerendered squares and quadrants codes (e.g., "5252, 5253, 5252a, 5253b")
        // First squares, then quadrants with quadrant letters
        List<String> allSquaresAndQuadrants = new ArrayList<>();

        // Add squares first
        if (record.getSquaresLegacy() != null) {
            allSquaresAndQuadrants.addAll(
                record.getSquaresLegacy().stream()
                    .map(s -> s.getCode() != null ? s.getCode() : "")
                    .filter(code -> !code.isEmpty())
                    .collect(Collectors.toList())
            );
        }

        // Add quadrants with letters
        if (record.getQuadrantsLegacy() != null) {
            allSquaresAndQuadrants.addAll(
                record.getQuadrantsLegacy().stream()
                    .map(q -> {
                        String sqCode = q.getSquare() != null ? q.getSquare().getCode() : "";
                        Character quadLetter = q.getQuadrantLetter();
                        return sqCode + quadLetter;
                    })
                    .filter(code -> !code.isEmpty())
                    .collect(Collectors.toList())
            );
        }

        String quadrantsCodes = allSquaresAndQuadrants.isEmpty() ? null
            : allSquaresAndQuadrants.stream().collect(Collectors.joining(", "));

        // Compute canEdit based on user permissions (same logic as in RecordUpdateController.isElligibleForRecordValidation)
        Boolean canEdit = false;
        if (!disableEditing && currentUser != null) {
            canEdit = currentUser.isMapAdmin() || (taxon != null && currentUser.getSupervisedTaxons().contains(taxon));
        }

        // Get nonvascular extension only if the app is configured for nonvascular
        NonVascularRecordExtension extension = ConfigHelper.isNonVascular() ? record.getNonVascularExtension() : null;

        return new RecordPladiasDto(
            // Basic identification
            record.getId(),
            taxonOriginal,

            // Taxon information
            taxonId,
            taxonNameLat,
            taxonNameHtml,

            // Coordinates and precision
            record.getLatitude(),
            record.getLongitude(),
            gpsPrecision,
            gpsCoordsSource,

            // Date information
            year,
            datePrecision,
            dateIso,

            // Validation status
            validationStatusId,
            validationStatusColor,
            validationStatusDescription,

            // Originality status
            originalityStatusId,
            originalityStatusName,
            originalityStatusIcon,

            // Authors and collectors
            batchAuthorId,
            batchAuthorName,
            batchCommitterId,
            batchCommitterName,
            recordAuthorsNames,

            // Location information
            computedQuadrantCode,
            computedSquareCode,
            districtId,
            districtName,
            nearestTownId,
            nearestTownName,
            nearestTownText,
            phytochorionPhytoId,
            phytochorionName,
            isPhytochorionComputed,
            quadrantsCodes,

            // Altitude
            record.getAltitudeMin(),
            record.getAltitudeMax(),
            altitudeApproximation,

            // Locality and environment
            record.getLocality(),
            record.getEnvironment(),
            record.getDetrev(),

            // Nonvascular-specific fields
            extension != null ? extension.getSubstrate() : null,
            extension != null ? extension.getChemical() : null,
            extension != null ? extension.getLocalityExtra() : null,
            extension != null ? extension.getSubstrateCategoryText() : null,

            // Remarks and comments
            record.getComment(),
            record.getRemarkExcerption(),
            record.getRemarkOther(),
            record.getRemarkDoubt(),
            unresolvedCommentsCount,
            comments,

            // Herbarium information
            herbariums,
            record.isHerbariumQuality(),

            // Source and licensing
            record.getSource(),
            record.getOriginalId(),
            licenseId,
            licenseName,

            // Project information
            projectId,
            projectName,
            institutionName,

            // Record flags
            record.isLocked(),
            record.isIncludedInMap(),
            hasHistory,

            // Timestamps
            record.getLastEditTimestamp(),
            record.getBatch() != null ? record.getBatch().getCreateTimestamp() : null,

            // Edit permission
            canEdit
        );
    }

    /**
     * Simple comment DTO for record comments
     */
    public record CommentDto(
        Long id,
        Long authorId,
        String authorName,
        String message,
        Timestamp createTimestamp,
        Boolean resolved,
        Boolean deleted,
        Boolean linkedForCurrentUser
    ) {
    }
}

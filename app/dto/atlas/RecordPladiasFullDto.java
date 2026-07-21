package dto.atlas;

import comparators.AuthorsEtAliiComparator;
import dto.selectItems.HerbariumOptionDto;
import geom.Coordinates;
import models.*;
import models.Record;
import models.biblio.Bibliography;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Extended DTO for PLADIAS Record information with full relationship data.
 * Extends RecordPladiasDto with:
 * - First level 1:M: recordAuthors with full Author details
 * - Second level M:N:
 * - herbariums with owner details
 * - mapSquares with quadrant relationships
 * - quadrants with square relationships
 * - comments with resolvedBy user details
 * - Additional relationships:
 * - taxon with rank and parent info
 * - bibliography details
 * - batch with author/committer full details
 * - nearestTownLegacyId district details
 */
public record RecordPladiasFullDto(
    // Basic identification
    Long id,

    // Coordinates and precision
    Double latitude,
    Double longitude,
    Integer gpsPrecision,
    String gpsCoordsSource,

    // Date information
    Integer year,
    String datePrecision,
    String dateIso,
    String taxonOriginal,

    // Taxon information
    Long taxonId,
    String taxonNameLat,
    String taxonNameHtml,

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

    // Location information
    String quadrantLetter,
    String squareCode,
    String computedQuadrantCode,
    String computedSquareCode,
    Long districtId,
    String districtName,
    Long nearestTownId,
    String nearestTownName,
    String nearestTownText,
    Integer phytochorionRelationId,
    String phytochorionRelationName,
    Boolean isPhytochorionComputed,

    // Computed location values based on GPS coordinates (ST_intersects)
    String quadrantCodeComputed,
    String phytochorionComputed,
    String districtComputed,

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
    Boolean hasHistory,

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

    // Timestamps
    Timestamp lastEditTimestamp,
    Timestamp createTimestamp,

    // Edit permission
    Boolean canEdit,

    // === EXTENDED FIELDS ===

    // Taxon details
    TaxonDto taxon,

    // Record authors with full author details
    List<RecordAuthorFullDto> recordAuthors,

    // Batch with full details
    BatchDto batch,

    // Bibliography reference
    BibliographyDto bibliography,

    // Nearest town legacy district details
    DistrictDto nearestTownLegacy,

    // Map squares with quadrant info
    List<MapSquareDto> mapSquares,

    // Quadrants with square info
    List<QuadrantDto> quadrants,

    // License with description
    LicenseDto license
) {
    /**
     * Create a comprehensive DTO from a Record entity with all relationships and edit permission.
     *
     * @param record      the record to convert
     * @param currentUser the current user (null if not authenticated)
     */
    public static RecordPladiasFullDto fromRecord(Record record, User currentUser) {
        Integer year = record.getDateSpecifier() != null ? record.getDateSpecifier().getYear() : null;
        String datePrecision = record.getDateSpecifier() != null ? record.getDateSpecifier().getDatePrecision() : null;
        String dateIso = record.getDateSpecifier() != null ? record.getDateSpecifier().toString() : null;
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

        Integer validationStatusId = record.getValidationStatusId();
        RecordValidationStatus validationStatus = RecordValidationStatus.find().byId(validationStatusId);
        String validationStatusColor = validationStatus != null ? validationStatus.getColor() : null;
        String validationStatusDescription = validationStatus != null ? validationStatus.getDescription() : null;

        RecordOriginalityStatus originalityStatus = record.getOriginalityStatus();
        Integer originalityStatusId = originalityStatus != null ? originalityStatus.getId() : null;
        String originalityStatusName = originalityStatus != null ? originalityStatus.getName() : null;
        String originalityStatusIcon = originalityStatus != null ? originalityStatus.getIcon() : null;
        Batch batch = record.getBatch();
        Long batchAuthorId = batch != null && batch.getAuthor() != null ? batch.getAuthor().getId() : null;
        String batchAuthorName = batch != null && batch.getAuthor() != null ? batch.getAuthor().getFullname() : null;
        Long batchCommitterId = batch != null && batch.getCommitter() != null ? batch.getCommitter().getId() : null;
        String batchCommitterName = batch != null && batch.getCommitter() != null ? batch.getCommitter().getFullname() : null;

        String quadrantLetter = record.getQuadrant().isPresent()
            ? String.valueOf(record.getQuadrant().get().getQuadrantLetter()) : null;

        String squareCode = record.getMapSquares() != null && !record.getMapSquares().isEmpty()
            ? record.getMapSquares().getFirst().getCode() : null;

        District district = record.getDistrict();
        Long districtId = district != null ? district.getId() : null;
        String districtName = district != null ? district.getName() : null;

        District nearestTown = record.getNearestTownLegacy();
        Long nearestTownId = nearestTown != null ? nearestTown.getId() : null;
        String nearestTownName = nearestTown != null ? nearestTown.getName() : null;
        String nearestTownText = record.getNearestTownText();

        models.Phytochorion phytochorion = record.getPhytochorion();
        String phytochorionRelationName = phytochorion != null ? phytochorion.getCorrectName() : null;
        Integer phytochorionRelationId = phytochorion != null ? phytochorion.getRowid() : null;
        Boolean isPhytochorionComputed = record.isPhytochorionComputed();

        Integer gpsPrecision = record.getGpsCoordsPrecision();
        String gpsCoordsSource = record.getGpsCoordSource();

        List<HerbariumOptionDto> herbariums = record.getHerbariums() != null
            ? record.getHerbariums().stream()
            .map(HerbariumOptionDto::fromHerbarium)
            .collect(Collectors.toList())
            : List.of();

        List<CommentDto> comments = record.getComments() != null
            ? record.getComments().stream()
            .map(c -> new CommentDto(
                c.getId(),
                c.getAuthor() != null ? c.getAuthor().getId() : null,
                c.getAuthor() != null ? c.getAuthor().getFullname() : null,
                c.getMessage(), c.getCreateTimestamp(), c.isResolved(), c.isDeleted(),
                c.getResolvedBy() != null ? c.getResolvedBy().getId() : null,
                c.getResolvedBy() != null ? c.getResolvedBy().getFullname() : null,
                c.getResolvedTimestamp()
            ))
            .collect(Collectors.toList())
            : List.of();

        Integer unresolvedCommentsCount = (int) record.getComments().stream()
            .filter(c -> !c.isResolved() && !c.isDeleted()).count();

        Long licenseId = null;
        String licenseName = null;
        var license = record.getLicense();
        if (license != null) {
            licenseId = (long) license.getId();
            licenseName = license.getKey();
        }

        Boolean altitudeApproximation = record.isAltitudeApproximation();

        Project project = record.getProject();
        Long projectId = project != null ? project.getId() : null;
        String projectName = project != null ? project.getName() : null;
        String institutionName = record.getProject().getInstitution().getName();

        // Extended fields
        TaxonDto taxonDto = null;
        if (taxon != null) {
            TaxonRankDto rankDto = taxon.getRank() != null
                ? new TaxonRankDto(taxon.getRank().getId(), taxon.getRank().getNameCz()) : null;
            taxonDto = new TaxonDto(taxon.getId(), taxon.getNameLat(), taxon.getNameCz(),
                taxon.getAuthor(), rankDto,
                taxon.getParent() != null ? taxon.getParent().getId() : null,
                taxon.getHybridParentage());
        }

        List<RecordAuthorFullDto> recordAuthorsDto = record.getRecordAuthors() != null
            ? record.getRecordAuthors().stream()
            .sorted(new AuthorsEtAliiComparator())
            .map(ra -> {
                Author author = ra.getAuthor();
                return new RecordAuthorFullDto(
                    ra.getRecord() != null ? ra.getRecord().getId() : null,
                    author != null ? author.getId() : null,
                    author != null ? author.getName() : null,
                    author != null ? author.getSurname() : null,
                    author != null ? author.toString() : null,
                    ra.getSuccession());
            })
            .collect(Collectors.toList())
            : List.of();

        BatchDto batchDto = null;
        if (batch != null) {
            batchDto = new BatchDto(
                batch.getId(),
                batch.getAuthor() != null ? batch.getAuthor().getId() : null,
                batch.getAuthor() != null ? batch.getAuthor().getFullname() : null,
                batch.getCommitter() != null ? batch.getCommitter().getId() : null,
                batch.getCommitter() != null ? batch.getCommitter().getFullname() : null,
                batch.getCreateTimestamp(), batch.getImported(), batch.getDeletionCode());
        }

        BibliographyDto biblioDto = null;
        Bibliography bibliography = record.getBibliography();
        if (bibliography != null) {
            biblioDto = new BibliographyDto(
                (long) bibliography.getId(), bibliography.getAuthors(), bibliography.getTitle(),
                bibliography.getYear() != null ? bibliography.getYear().toString() : null, null, null);
        }

        DistrictDto nearestTownLegacyDto = null;
        District nearestTownLegacy = record.getNearestTownLegacy();
        if (nearestTownLegacy != null) {
            Integer districtTypeId = nearestTownLegacy.getDistrictType() != null
                ? (int) nearestTownLegacy.getDistrictType().getId() : null;
            String districtTypeName = nearestTownLegacy.getDistrictType() != null
                ? nearestTownLegacy.getDistrictType().getName() : null;
            nearestTownLegacyDto = new DistrictDto(
                nearestTownLegacy.getId(), nearestTownLegacy.getName(), nearestTownLegacy.getAbbrev(),
                nearestTownLegacy.getIdentifier(), districtTypeId, districtTypeName);
        }

        List<MapSquareDto> mapSquaresDto = record.getMapSquares() != null
            ? record.getMapSquares().stream()
            .map(sq -> {
                var centroid = sq.getCentroid();
                return new MapSquareDto(sq.getId(), sq.getCode(),
                    centroid != null ? centroid.getX() : null,
                    centroid != null ? centroid.getY() : null);
            })
            .collect(Collectors.toList())
            : List.of();

        List<QuadrantDto> quadrantsDto = record.getQuadrantsLegacy() != null
            ? record.getQuadrantsLegacy().stream()
            .map(q -> new QuadrantDto(q.getId(), q.getCode(), q.getQuadrantLetter(),
                q.getSquare() != null ? q.getSquare().getId() : null,
                q.getSquare() != null ? q.getSquare().getCode() : null))
            .collect(Collectors.toList())
            : List.of();

        // Compute location values based on GPS coordinates using ST_intersects
        String quadrantCodeComputed = null;
        String phytochorionComputed = null;
        String districtComputed = null;
        String computedSquareCode = null;

        if (record.hasCoords()) {
            Coordinates coords = record.getCoords();

            // Compute quadrant from GPS coordinates
            QuadrantNew computedQuadrant = QuadrantNew.findByPoint(coords);
            if (computedQuadrant != null) {
                quadrantCodeComputed = computedQuadrant.getCode();
                // Extract square code from quadrant code (e.g., "5252a" -> "5252")
                computedSquareCode = computedQuadrant.getCode().substring(0, computedQuadrant.getCode().length() - 1);
            }

            // Compute phytochorion from GPS coordinates (format: phytoId.name)
            Phytochorion computedPhytochorion = Phytochorion.findByPoint(coords);
            if (computedPhytochorion != null) {
                phytochorionComputed = computedPhytochorion.getPhytoId() + "." + computedPhytochorion.getName();
            }

            // Compute district from GPS coordinates
            District computedDistrict = District.findDistrictByPoint(coords);
            if (computedDistrict != null) {
                districtComputed = computedDistrict.getName();
            }
        }

        LicenseDto licenseDto = null;
        if (license != null) {
            licenseDto = new LicenseDto(license.getId(), license.getKey(), license.getDescription());
        }

        // Compute canEdit based on user permissions (same logic as in RecordUpdateController.isElligibleForRecordValidation)
        Boolean canEdit = false;
        if (currentUser != null) {
            canEdit = currentUser.isMapAdmin() || (taxon != null && currentUser.getSupervisedTaxons().contains(taxon));
        }

        return new RecordPladiasFullDto(
            record.getId(), record.getLatitude(), record.getLongitude(), gpsPrecision, gpsCoordsSource,
            year, datePrecision, dateIso, taxonOriginal,
            taxonId, taxonNameLat, taxonNameHtml,
            validationStatusId, validationStatusColor, validationStatusDescription,
            originalityStatusId, originalityStatusName, originalityStatusIcon,
            batchAuthorId, batchAuthorName, batchCommitterId, batchCommitterName,
            quadrantLetter, squareCode, quadrantCodeComputed, computedSquareCode, districtId, districtName, nearestTownId, nearestTownName, nearestTownText, phytochorionRelationId,
            phytochorionRelationName, isPhytochorionComputed,
            quadrantCodeComputed, phytochorionComputed, districtComputed,
            record.getAltitudeMin(), record.getAltitudeMax(), altitudeApproximation,
            record.getLocality(), record.getEnvironment(), record.getDetrev(),
            record.getNonVascularExtension() != null ? record.getNonVascularExtension().getSubstrate() : null,
            record.getNonVascularExtension() != null ? record.getNonVascularExtension().getChemical() : null,
            record.getNonVascularExtension() != null ? record.getNonVascularExtension().getLocalityExtra() : null,
            record.getNonVascularExtension() != null ? record.getNonVascularExtension().getSubstrateCategoryText() : null,
            record.getComment(), record.getRemarkExcerption(), record.getRemarkOther(), record.getRemarkDoubt(),
            unresolvedCommentsCount, comments, record.hasHistory(), herbariums, record.isHerbariumQuality(),
            record.getSource(), record.getOriginalId(), licenseId, licenseName,
            projectId, projectName, institutionName, record.isLocked(), record.isIncludedInMap(),
            record.getLastEditTimestamp(), batch != null ? batch.getCreateTimestamp() : null,
            canEdit,
            taxonDto, recordAuthorsDto, batchDto, biblioDto, nearestTownLegacyDto,
            mapSquaresDto, quadrantsDto, licenseDto);
    }

    /**
     * Simple comment DTO for record comments with resolvedBy user
     */
    public record CommentDto(
        Long id,
        Long authorId,
        String authorName,
        String message,
        Timestamp createTimestamp,
        Boolean resolved,
        Boolean deleted,
        Long resolvedById,
        String resolvedByName,
        Timestamp resolvedTimestamp
    ) {
    }

    /**
     * Taxon DTO with rank and parent info
     */
    public record TaxonDto(
        Long id,
        String nameLat,
        String nameCz,
        String author,
        TaxonRankDto rank,
        Long parentId,
        String hybridParentage
    ) {
    }

    /**
     * TaxonRank DTO
     */
    public record TaxonRankDto(
        Integer id,
        String name
    ) {
    }

    /**
     * RecordAuthor DTO with full author details
     */
    public record RecordAuthorFullDto(
        Long recordId,
        Integer authorId,
        String authorName,
        String authorSurname,
        String authorFullName,
        Integer succession
    ) {
    }

    /**
     * Batch DTO with full user details
     */
    public record BatchDto(
        Long id,
        Long authorId,
        String authorName,
        Long committerId,
        String committerName,
        Timestamp createTimestamp,
        Boolean imported,
        String deletionCode
    ) {
    }

    /**
     * Bibliography DTO
     */
    public record BibliographyDto(
        Long id,
        String citation,
        String title,
        String year,
        String isbn,
        String issn
    ) {
    }

    /**
     * District DTO
     */
    public record DistrictDto(
        Long id,
        String name,
        String abbrev,
        String identifier,
        Integer districtTypeId,
        String districtTypeName
    ) {
    }

    /**
     * MapSquare DTO with quadrant info
     */
    public record MapSquareDto(
        Integer id,
        String code,
        Double centroidLon,
        Double centroidLat
    ) {
    }

    /**
     * Quadrant DTO with square info
     */
    public record QuadrantDto(
        Integer id,
        String code,
        Character quadrantLetter,
        Integer squareId,
        String squareCode
    ) {
    }

    /**
     * License DTO with description
     */
    public record LicenseDto(
        Integer id,
        String key,
        String description
    ) {
    }
}





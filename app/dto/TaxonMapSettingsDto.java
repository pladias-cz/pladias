package dto;

import java.sql.Timestamp;

public record TaxonMapSettingsDto(
    Long taxonId,
    String taxonNameLat,
    String taxonRankCz,
    Boolean isMapped,
    Integer commonThreshold,
    Boolean isProtected,
    String preslia,
    String revisors,
    String revisorsComment,
    String revisorsPrintComment,
    Integer revisionStatusId,
    String revisionStatusDescription,
    Integer publicationStatusId,
    String publicationStatusDescription,
    Long lastEditTimestamp,
    Long parentTaxonId,
    String parentTaxonNameLat,
    Integer csvMapDetailId,
    Timestamp csvMapDetailTimestamp,
    Boolean hasPng,
    Boolean currentUserIsRevisor,
    Integer mapType
) {
}

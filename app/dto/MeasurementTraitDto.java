package dto;

public record MeasurementTraitDto(
    Integer id,
    String createTimestamp,          // ISO string
    Integer totalTaxonCount,

    String sourceHtml,
    String descriptionCz,

    String ownerHtml,
    String visibilityDescriptionCz,

    Boolean hasAttachment,
    Boolean isDefault,

    Boolean canDownload,
    Boolean canDelete,
    Boolean canExport
) {
}

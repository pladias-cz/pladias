package dto;

public record BibliographyDto(
    int id,
    String originalSourceKey,
    String authors,
    Integer year,
    String title,
    String etc,
    String remarks,
    Long originalId,
    boolean excerpted,
    String journal,
    String journalId,
    Integer recordsCount
) {
}

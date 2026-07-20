package dto;

public record TaxonDto(
    Long id,
    String nameLat,
    String nameHtml,
    String nameCz,
    String author,
    String hybridParents,
    String note,
    Long parentId,
    Boolean suppressed,
    Integer rank
) {
}

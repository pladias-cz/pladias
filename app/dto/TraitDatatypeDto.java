package dto;

public record TraitDatatypeDto(
    Integer id,
    String name,
    String nameCz,
    String description,
    Boolean multiplicity,
    Boolean dominance,
    Boolean frequency,
    Boolean comment,
    Boolean immeasurability
) {
}

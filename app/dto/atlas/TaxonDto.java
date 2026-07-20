package dto.atlas;

import models.Taxon;

/**
 * DTO for Taxon information.
 */
public record TaxonDto(
    Long id,
    String nameLat,
    String nameCz,
    String rank
) {
    public static TaxonDto fromTaxon(Taxon taxon) {
        return new TaxonDto(
            taxon.getId(),
            taxon.getNameLat() != null ? taxon.getNameLat() : "",
            taxon.getNameCz() != null ? taxon.getNameCz() : "",
            taxon.getRank() != null ? taxon.getRank().getNameCz() : ""
        );
    }
}
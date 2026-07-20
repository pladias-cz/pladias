package dto.selectItems;

import models.Herbarium;

public record HerbariumOptionDto(
    Integer id,
    String name,
    String label
) {
    public static HerbariumOptionDto fromHerbarium(Herbarium herbarium) {
        return new HerbariumOptionDto(
            herbarium.getId(),
            herbarium.getAbbrev() != null ? herbarium.getAbbrev() : herbarium.getId() + " " + herbarium.getName(),
            herbarium.getAbbrevExplanation() != null ? herbarium.getAbbrevExplanation() : herbarium.getName()
        );
    }
}
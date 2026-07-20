package dto.selectItems;

import models.Phytochorion;

public record PhytochorionOptionDto(
    Integer id,
    String name,
    String label
) {
    public static PhytochorionOptionDto fromPhytochorion(Phytochorion phytochorion) {
        return new PhytochorionOptionDto(
            phytochorion.getRowid(),
            phytochorion.getCorrectName(),
            phytochorion.getDetailedName()
        );
    }
}

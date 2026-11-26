package dto.selectItems;

/**
 * Volba hlavní kategorie substrátu pro editaci záznamu (ne-cevnaté).
 * Hlavní kategorie je samostatně editovatelná – záznam smí znát jen ji,
 * upřesňující {@code Substrate2} je pak prázdný
 * ({@code RecordsService.updateDaliborSubstrate1}).
 *
 * @param id   id hlavního substrátu (PATCH klíč SUBSTRATE1)
 * @param name český název kategorie
 */
public record SubstrateCategoryDto(
    Integer id,
    String name
) {
}
package dto.selectItems;

/**
 * Volba kategorie substrátu pro editaci záznamu (ne-cevnaté).
 * Id je substrát 2 – backend z něj odvodí navazující substrát 1
 * ({@code RecordsService.updateDaliborSubstrate2}).
 *
 * @param id           id substrátu 2 (PATCH klíč SUBSTRATE2)
 * @param name         sloučený popisek „Hlavní – upřesňující"
 * @param substrate1Id id odvozeného hlavního substrátu
 * @param substrate1Text český název hlavního substrátu
 */
public record SubstrateOptionDto(
    Integer id,
    String name,
    Integer substrate1Id,
    String substrate1Text
) {
}

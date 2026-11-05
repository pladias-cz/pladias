package dto;

/**
 * Položka seznamu souborů ke stažení na stránce /downloads.
 *
 * @param dynamic true = xlsx generovaný backendem na požádání (url vede na
 *                apiClientem volaný endpoint); false = statický soubor z /public
 */
public record DownloadDto(
    String description,
    String manager,
    String version,
    String url,
    boolean dynamic
) {
}


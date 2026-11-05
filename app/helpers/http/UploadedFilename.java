package helpers.http;

/**
 * Sanitizace názvu souboru přijatého z multipart uploadu před uložením do
 * databáze (docs/security.md, pův. zjištění M11): název se redukuje na poslední
 * segment cesty (odstranění {@code ../../}, "/"" i "\"), řídicí znaky (vč. CRLF)
 * a uvozovky se nahradí podtržítkem a délka se omezí na 255 znaků (varchar
 * filename ve schématu DB). Při stažení je název navíc escapován helperem
 * {@link ContentDisposition}.
 */
public class UploadedFilename {

    private static final int MAX_LENGTH = 255;

    private UploadedFilename() {
    }

    /**
     * Bezpečný název souboru pro uložení; pokud je vstup {@code null}, prázdný
     * nebo po sanitizaci nic nezbyde (samotná cesta), vrátí se {@code fallback}.
     */
    public static String sanitize(String rawFilename, String fallback) {
        if (rawFilename == null) {
            return fallback;
        }
        String name = lastSegment(rawFilename).trim();
        if (name.isEmpty()) {
            return fallback;
        }
        StringBuilder sb = new StringBuilder(name.length());
        for (int i = 0; i < name.length() && sb.length() < MAX_LENGTH; i++) {
            char c = name.charAt(i);
            sb.append(c >= 0x20 && c != 0x7F && c != '"' ? c : '_');
        }
        return sb.toString();
    }

    /** Poslední segment cesty – odřízne adresářovou část u "/" i "\". */
    private static String lastSegment(String filename) {
        int cut = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
        return cut >= 0 ? filename.substring(cut + 1) : filename;
    }
}

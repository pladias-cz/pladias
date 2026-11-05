package helpers.http;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;

/**
 * Stavba hlavičky Content-Disposition pro stahované soubory (docs/security.md,
 * pův. zjištění L5): quotovaný ASCII fallback + RFC 5987
 * {@code filename*=UTF-8''...} pro názvy s diakritikou či speciálními znaky
 * (typicky z DB). Frontend ({@code resolveFilename} v apiClient.ts) i moderní
 * prohlížeče preferují parametr {@code filename*}; ASCII fallback zůstává pro
 * starší klienty a curl.
 */
public class ContentDisposition {

    private ContentDisposition() {
    }

    /**
     * Hodnota hlavičky pro stažení souboru:
     * {@code attachment; filename="..."; filename*=UTF-8''...}.
     */
    public static String attachment(String filename) {
        if (filename == null) {
            return "attachment";
        }
        return "attachment; filename=\"" + asciiFallback(filename)
            + "\"; filename*=UTF-8''" + rfc5987(filename);
    }

    /**
     * ASCII náhrada pro parametr filename: diakritika odstraněna (ě → e),
     * uvozovky, zpětná lomítka a řídicí znaky (vč. CRLF) nahrazeny podtržítkem –
     * v quotovaném tvaru tak název nikdy nezlomí hlavičku.
     */
    private static String asciiFallback(String filename) {
        String decomposed = Normalizer.normalize(filename, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "");
        StringBuilder sb = new StringBuilder(decomposed.length());
        for (int i = 0; i < decomposed.length(); i++) {
            char c = decomposed.charAt(i);
            sb.append(c >= 0x20 && c < 0x7F && c != '"' && c != '\\' ? c : '_');
        }
        return sb.toString();
    }

    /** RFC 5987: UTF-8 byty; znaky attr-char zůstávají, ostatní jako %XX. */
    private static String rfc5987(String filename) {
        StringBuilder sb = new StringBuilder(filename.length());
        for (byte b : filename.getBytes(StandardCharsets.UTF_8)) {
            int c = b & 0xFF;
            if (isAttrChar(c)) {
                sb.append((char) c);
            } else {
                sb.append(String.format("%%%02X", c));
            }
        }
        return sb.toString();
    }

    private static boolean isAttrChar(int c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')
            || c == '!' || c == '#' || c == '$' || c == '&' || c == '+' || c == '-'
            || c == '.' || c == '^' || c == '_' || c == '`' || c == '|' || c == '~';
    }
}

package utils;

import java.text.Normalizer;

public class PladiasStringUtils {

    public static String normalize(String input) {
        if (input == null)
            return null;

        return Normalizer.normalize(input, Normalizer.Form.NFD)
            .replaceAll("[^\\p{ASCII}]", "");
    }
}

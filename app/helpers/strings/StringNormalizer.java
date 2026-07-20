package helpers.strings;

import org.apache.commons.lang3.StringUtils;

public class StringNormalizer {

    final static String SPACES_PATTERN = "[\\u00A0\\u1680\\u180E\\u2000-\\u200B\\u202F\\u205F\\u3000\\uFEFF]";

    public static String normalizeSpaces(String input) {
        if (input == null) return null;

        String removedNonbreakableSpaces = input.replaceAll(SPACES_PATTERN, " ");
        String normalized = StringUtils.normalizeSpace(removedNonbreakableSpaces);

        return normalized;
    }
}

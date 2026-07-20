package utils;

public class SqlUtils {

    public static String sanitize(String input) {
        if (input == null)
            return null;

        return input.replace("'", "''");
    }

    public static String replaceApostropheByBackApostrophe(String input) {
        if (input == null)
            return null;

        return input.replace("'", "`");
    }

    public static String toRegex(String input) {
        return input.replace('*', '%');
    }
}

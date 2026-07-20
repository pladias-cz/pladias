package utils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ExcelFilenameGenerator {

    private static final Pattern FilenamePattern;

    static {
        FilenamePattern = Pattern.compile(".+_ver(\\d{2}).(xlsx|xls)");
    }

    public static String generateDecoratedFileName(String filename) {
        String newFilename;
        Matcher m = FilenamePattern.matcher(filename);
        if (m.matches()) {
            int oldVersion = Integer.parseInt(m.group(1));
            newFilename = filename.replace(
                "ver" + String.format("%02d", oldVersion) + ".xls",
                "ver" + String.format("%02d", oldVersion + 1) + ".xls");
        } else {
            newFilename = filename.replace(".xls", "_ver01.xls");
        }
        newFilename = newFilename.replace(' ', '_');
        return newFilename;
    }
}

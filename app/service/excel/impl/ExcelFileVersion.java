package service.excel.impl;

import java.util.HashMap;
import java.util.Map;

public enum ExcelFileVersion {

    UNKNOWN(""),
    VERSION2("v2"),
    VERSION3("v3"),
    VERSION4("v4");

    private static final Map<String, ExcelFileVersion> ByVersion = new HashMap<>();

    static {
        for (ExcelFileVersion e : values()) {
            ByVersion.put(e._version, e);
        }
    }

    private final String _version;

    ExcelFileVersion(String version) {
        _version = version;
    }

    public static ExcelFileVersion valueOfVersion(String version) {
        String normalized = version.toLowerCase().trim();
        if (ByVersion.containsKey(normalized)) {
            return ByVersion.get(normalized);
        }
        return UNKNOWN;
    }
}

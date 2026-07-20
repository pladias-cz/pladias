package utils;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import platform.ProjectConstants;
import service.config.TaxonGroupType;

import java.util.List;

@Deprecated //use ConfigService instead
public class ConfigHelper {

    private static final Config config;
    private static TaxonGroupType taxonGroupType = TaxonGroupType.None;

    static {
        config = ConfigFactory.load();
    }

    public static String getString(String key) {
        return config.getString(key);
    }

    public static boolean getBoolean(String key) {
        return config.getBoolean(key);
    }

    public static int getInteger(String key) {
        return config.getInt(key);
    }

    public static List<Integer> getIntList(String key) {
        return config.getIntList(key);
    }

    public static List<String> getStringList(String key) {
        return config.getStringList(key);
    }

    public static long getLong(String key) {
        return config.getLong(key);
    }

    public static boolean isVascular() {
        assureTaxonGroupInitialized();
        return (taxonGroupType == TaxonGroupType.Vascular);
    }

    public static boolean isNonVascular() {
        assureTaxonGroupInitialized();
        return (taxonGroupType == TaxonGroupType.NonVascular);
    }

    public static boolean hasKey(String key) {
        return config.hasPath(key);
    }

    public static <T> T selectByTaxonGroup(T vascular, T nonVascular) {
        return (isVascular())
            ? vascular
            : nonVascular;
    }

    private static void assureTaxonGroupInitialized() {
        if (taxonGroupType != TaxonGroupType.None) {
            return;
        }

        String value = (config.getString(ProjectConstants.AppTaxonGroup));

        taxonGroupType = value.equalsIgnoreCase(ProjectConstants.Vascular)
            ? TaxonGroupType.Vascular
            : TaxonGroupType.NonVascular;
    }
}

package excel;

import models.License;
import platform.ProjectConstants;
import utils.ConfigHelper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LicenseDictionary {

    private static LicenseDictionary instance;
    private final Map<String, License> licenseKeyMap;
    private final License defaultLicense;
    private final List<License> creativeCommonsLicenses;

    private LicenseDictionary() {
        licenseKeyMap = populateLicenseMap();
        defaultLicense = getLicense(ProjectConstants.LicenseDefaultId);
        creativeCommonsLicenses = getLicenseCollection(ProjectConstants.LicenseCreativeCommonsIds);
    }

    public static synchronized LicenseDictionary getInstance() {
        if (instance == null) {
            instance = new LicenseDictionary();
        }
        return instance;
    }

    private Map<String, License> populateLicenseMap() {
        List<License> licenses = License.find().all();

        Map<String, License> licenseMap = new HashMap<String, License>();

        for (License lic : licenses) {
            licenseMap.put(lic.getKey(), lic);
        }
        return licenseMap;
    }

    private License getLicense(String configLicenseKey) {
        String licenseName = ConfigHelper.getString(configLicenseKey);
        return licenseKeyMap.get(licenseName);
    }

    private List<License> getLicenseCollection(String configLicenseCollectionKey) {
        List<String> licenseKeys = ConfigHelper.getStringList(configLicenseCollectionKey);
        List<License> licenses = new ArrayList<License>();
        for (String licenseKey : licenseKeys) {
            licenses.add(licenseKeyMap.get(licenseKey));
        }
        return licenses;
    }

    public License getByKey(String key) throws Exception {
        if (!licenseKeyMap.containsKey(key)) {
            throw new Exception("Key " + key + " not found in license map.");
        }
        return licenseKeyMap.get(key);
    }

    public License getDefault() {
        return defaultLicense;
    }

    public List<License> getCreativeCommonLicenses() {
        return new ArrayList<License>(creativeCommonsLicenses);
    }
}

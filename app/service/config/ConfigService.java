package service.config;

import com.google.inject.Inject;
import com.typesafe.config.Config;
import models.PlayMessage;
import models.types.LanguageCode;
import platform.ProjectConstants;

import java.util.List;

public class ConfigService implements IConfigService {
    private final Config _config;
    private final TaxonGroupType _taxonGroupType;

    @Inject
    public ConfigService(Config config) {
        this._config = config;
        _taxonGroupType = getTaxonGroupType(config);
    }

    public String getString(String key) {
        return _config.getString(key);
    }

    public String getStringOrDefault(String key, String defaultValue) {
        try {
            return getString(key);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    public boolean getBoolean(String key) {
        return _config.getBoolean(key);
    }

    public int getInteger(String key) {
        return _config.getInt(key);
    }

    @Override
    public int getIntegerOrDefault(String key, int defaultValue) {
        try {
            return getInteger(key);
        } catch (Exception ex) {
            return defaultValue;
        }
    }

    public List<Integer> getIntList(String key) {
        return _config.getIntList(key);
    }

    public List<String> getStringList(String key) {
        return _config.getStringList(key);
    }

    public long getLong(String key) {
        return _config.getLong(key);
    }

    @Override
    public boolean isVascular() {
        return (_taxonGroupType == TaxonGroupType.Vascular);
    }

    @Override
    public boolean isNonVascular() {
        return (_taxonGroupType == TaxonGroupType.NonVascular);
    }

    private TaxonGroupType getTaxonGroupType(Config config) {
        String value = config.getString(ProjectConstants.AppTaxonGroup);

        if (value.equalsIgnoreCase(ProjectConstants.Vascular))
            return TaxonGroupType.Vascular;
        else if (value.equalsIgnoreCase(ProjectConstants.Nonvascular))
            return TaxonGroupType.NonVascular;

        return TaxonGroupType.None;
    }

    @Override
    public String getDbMessage(String key) {
        return getDbMessage(key, LanguageCode.CS);
    }

    @Override
    public String getDbMessage(String key, LanguageCode language) {
        PlayMessage message = PlayMessage.getMessage(key, language);

        if (message != null) {
            return message.getValue();
        }

        throw new UnsupportedOperationException(
            String.format("Message with key '%s' and language '%s' not found in database", key, language));
    }

    @Override
    public boolean hasAtlasModule() {
        return getBoolean(ProjectConstants.hasAtlasModuleKey);
    }

    @Override
    public boolean hasTraitModule() {
        return getBoolean(ProjectConstants.hasTraitModuleKey);
    }

    @Override
    public boolean hasBiblioModule() {
        return getBoolean(ProjectConstants.hasBiblioModuleKey);
    }
}

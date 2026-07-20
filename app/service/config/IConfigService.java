package service.config;

import models.types.LanguageCode;

import java.util.List;

public interface IConfigService {

    String getString(String key);

    String getStringOrDefault(String key, String defaultValue);

    boolean getBoolean(String key);

    int getInteger(String key);

    int getIntegerOrDefault(String key, int defaultValue);

    List<Integer> getIntList(String key);

    List<String> getStringList(String key);

    long getLong(String key);

    boolean isVascular();

    boolean isNonVascular();

    String getDbMessage(String key);

    String getDbMessage(String key, LanguageCode language);

    boolean hasAtlasModule();

    boolean hasTraitModule();

    boolean hasBiblioModule();
}

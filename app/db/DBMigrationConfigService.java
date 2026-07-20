package db;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import models.types.LanguageCode;
import service.config.IConfigService;

import java.io.File;
import java.util.List;

public class DBMigrationConfigService implements IConfigService {

    private static final String UNSUPPORTED_MESSAGE = "DBMigrationConfigService does not support this operation.";
    private final Config config;

    public DBMigrationConfigService(String file) {
        this.config = loadConfig(file);
    }

    private Config loadConfig(String file) {
        if (file != null && !file.isBlank()) {
            File configFile = new File(file);
            if (configFile.exists()) {
                return ConfigFactory.parseFile(configFile).resolve();
            }

            String resourceName = file.replace("\\", "/");
            if (resourceName.startsWith("./conf/")) {
                resourceName = resourceName.substring("./conf/".length());
            }
            if (resourceName.startsWith("conf/")) {
                resourceName = resourceName.substring("conf/".length());
            }

            return ConfigFactory.parseResources(resourceName).resolve();
        }

        return ConfigFactory.parseResources("common.conf").resolve();
    }

    @Override
    public String getString(String key) {
        return config.getString(key);
    }

    @Override
    public String getStringOrDefault(String key, String defaultValue) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public boolean getBoolean(String key) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public int getInteger(String key) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public int getIntegerOrDefault(String key, int defaultValue) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public List<Integer> getIntList(String key) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public List<String> getStringList(String key) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public long getLong(String key) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public boolean isVascular() {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public boolean isNonVascular() {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public String getDbMessage(String key) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public String getDbMessage(String key, LanguageCode language) {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public boolean hasAtlasModule() {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public boolean hasTraitModule() {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }

    @Override
    public boolean hasBiblioModule() {
        throw new UnsupportedOperationException(UNSUPPORTED_MESSAGE);
    }
}

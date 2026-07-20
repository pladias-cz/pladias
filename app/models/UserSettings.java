package models;

import io.ebean.*;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
@SuppressWarnings("serial")
public class UserSettings extends Model {

    public static final String QualifiedTableName = "public.user_settings";
    public static final String ResultsCountKey = "atlas_searchform_resultscount_max";
    @Embedded
    @Id
    private UserSettingPK settings;
    private String value;

    public static final Finder<UserSettingPK, UserSettings> find() {
        return new Finder<>(UserSettings.class);
    }

    public UserSettingPK getSettings() {
        return settings;
    }

    public void setSettings(UserSettingPK settings) {
        this.settings = settings;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }


    public boolean getBooleanValue(boolean defaultValue) {
        try {
            return Boolean.parseBoolean(value);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    public String getStringValue(String defaultValue) {
        return value != null ? value : defaultValue;
    }
}

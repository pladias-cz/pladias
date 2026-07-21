package settings.user;

import java.util.HashMap;
import java.util.Map;

import models.User;
import models.UserSettingPK;
import models.UserSettings;

public class UserOptions
{
	public static final String TraitsSubstituteNullKey = "traits_substitute_null";
	public static final String TraitsSubstituteUnmeasurableKey = "traits_substitute_unmeasurable";
	public static final String TraitsSubstituteTrueKey = "traits_substitute_true";
	public static final String TraitsSubstituteFalseKey = "traits_substitute_false";

	public static final String TraitsSubstitutePercentIntegerKey = "traits_substitute_percentasinteger";
	public static final String TraitsSubstituteInEnglishKey = "traits_substitute_english";
	public static final String ApplicationLanguageEnglishKey = "application_language_english";

	private static final String TraitsSubstituteNullDefaultValue = "null";
	private static final String TraitsSubstituteUnmeasurableDefaultValue = "x";
	private static final String TraitsSubstituteTrueDefaultValue = "PRAVDA";
	private static final String TraitsSubstiuteFalseDefaultValue = "NEPRAVDA";
	private static final String TraitsSubstitutePercentIntegerDefaultValue = "false";
	private static final String TraitsSubstituteEnumInEnglishDefaultValue = "false";

	private User user;
	private Map<String, Boolean> stringToBoolMapping;
	private Map<Boolean, String> boolToStringMapping;
	private Map<String, String>  mappings;

	public UserOptions(User user)
	{
		this.user = user;
		initBoolValuesMapping();
	}

	public String get(String key)
	{
		return getMappings().get(key);
	}

	private Map<String, String> getMappings()
	{
		if (mappings == null)
		{
			mappings = new HashMap<>();
			mappings.put(TraitsSubstituteNullKey, buildSettingsValue(TraitsSubstituteNullKey, TraitsSubstituteNullDefaultValue));
			mappings.put(TraitsSubstituteUnmeasurableKey, buildSettingsValue(TraitsSubstituteUnmeasurableKey, TraitsSubstituteUnmeasurableDefaultValue));
			mappings.put(TraitsSubstituteTrueKey, buildSettingsValue(TraitsSubstituteTrueKey, TraitsSubstituteTrueDefaultValue));
			mappings.put(TraitsSubstituteFalseKey, buildSettingsValue(TraitsSubstituteFalseKey, TraitsSubstiuteFalseDefaultValue));
			mappings.put(TraitsSubstitutePercentIntegerKey, buildSettingsValue(TraitsSubstitutePercentIntegerKey, TraitsSubstitutePercentIntegerDefaultValue));
			mappings.put(TraitsSubstituteInEnglishKey, buildSettingsValue(TraitsSubstituteInEnglishKey, TraitsSubstituteEnumInEnglishDefaultValue));
			return mappings;
		}
		return mappings;
	}

	public String getNullSubstitution()
	{
		return getMappings().get(TraitsSubstituteNullKey);
	}

	public String boolToUserString(boolean boolValue)
	{
		return boolToStringMapping.get(boolValue);
	}

	public String getUnmeasurableValue()
	{
		return getMappings().get(TraitsSubstituteUnmeasurableKey);
	}

	public boolean percentageAsInteger()
	{
		String intPercentage = buildSettingsValue(TraitsSubstitutePercentIntegerKey, Boolean.TRUE.toString());
		return Boolean.parseBoolean(intPercentage);
	}

	public boolean displayInEnglish()
	{
		String inEnglish = buildSettingsValue(TraitsSubstituteInEnglishKey, Boolean.FALSE.toString());
		return Boolean.parseBoolean(inEnglish);
	}

	public boolean displayApplicationInEnglish()
	{
		String inEnglish = buildSettingsValue(ApplicationLanguageEnglishKey, Boolean.FALSE.toString());
		return Boolean.parseBoolean(inEnglish);
	}


	public Boolean userStringToBool(String value) throws Exception
	{
		//may throw
		if (stringToBoolMapping.containsKey(value))
			return stringToBoolMapping.get(value);

		throw new Exception(String.format("Value %s not found in mapping.", value));
	}

	private UserSettings getSettings(String key)
	{
		if (user == null)
			return null;

		UserSettingPK usPk = new UserSettingPK();
		usPk.setUserId(user.getId());
		usPk.setKey(key);

		return UserSettings.find().byId(usPk);
	}

	private void initBoolValuesMapping()
	{
		stringToBoolMapping = new HashMap<>();
		boolToStringMapping = new HashMap<>();

		UserSettings settings = getSettings(TraitsSubstituteTrueKey);
		populateBoolValuesMapping(settings, TraitsSubstituteTrueDefaultValue, true);

		settings = getSettings(TraitsSubstituteFalseKey);
		populateBoolValuesMapping(settings, TraitsSubstiuteFalseDefaultValue, false);

		//populate with null
		settings = getSettings(TraitsSubstituteNullKey);
		populateBoolValuesMapping(settings, TraitsSubstituteNullDefaultValue, null);
	}

	private void populateBoolValuesMapping(UserSettings settings, String value, Boolean boolValue)
	{
		String userValue = value;
		if (settings != null)
		{
			userValue = settings.getValue();
		}
		stringToBoolMapping.put(userValue, boolValue);
		boolToStringMapping.put(boolValue,  userValue);
	}

	private String buildSettingsValue(String key, String defaultValue)
	{
		UserSettings settings = getSettings(key);
		if (settings == null)
		{
			return defaultValue;
		}
		return settings.getValue();
	}
}

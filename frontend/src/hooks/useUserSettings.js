import {useState} from "react";
import {useTranslation} from "react-i18next";
import {changeLanguage} from "@/i18n/i18n";

/**
 * Mapping from backend key format (snake_case) to frontend state key format (camelCase)
 */
const BACKEND_TO_STATE_KEY_MAPPING = {
    traits_substitute_false: "traitsSubstituteFalse",
    traits_substitute_true: "traitsSubstituteTrue",
    traits_substitute_null: "traitsSubstituteNull",
    traits_substitute_unmeasurable: "traitsSubstituteUnmeasurable",
    traits_substitute_percentasinteger: "traitsSubstitutePercentInteger",
    application_language: "applicationLanguage",
    traits_substitute_english: "traitsSubstituteInEnglish",
};

/**
 * Checks if a setting value should be parsed as boolean
 */
const isBooleanSetting = (backendKey) => {
    return backendKey.includes("traits_substitute_percentasinteger") || 
           backendKey.includes("traits_substitute_english");
};

/**
 * Converts backend key (snake_case) to frontend state key (camelCase)
 * @param {string} backendKey - The key from the backend
 * @returns {string} - The corresponding state key
 */
export const mapBackendKeyToStateKey = (backendKey) => {
    return BACKEND_TO_STATE_KEY_MAPPING[backendKey] ?? backendKey;
};

/**
 * Custom hook for managing user settings with save functionality.
 * Provides a reusable way to save user settings to the backend.
 * 
 * @param {Function} onSettingSaved - Optional callback function called after a setting is successfully saved
 * @returns {{
 *   loading: boolean,
 *   message: string | null,
 *   error: string | null,
 *   saveSetting: (key: string, value: string | boolean, updateState?: Function, stateKey?: string) => Promise<void>
 * }}
 */
export const useUserSettings = (onSettingSaved = null) => {
    const {t} = useTranslation();
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    /**
     * Saves a user setting to the backend
     * 
     * @param {string} key - The backend key for the setting (e.g., "application_language")
     * @param {string|boolean} value - The value to save
     * @param {Function} [updateState] - Optional callback to update local state after successful save
     * @param {string} [stateKey] - Optional state key override (defaults to mapped key from backend key)
     */
    const saveSetting = async (key, value, updateState = null, stateKey = null) => {
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(`/api/react/user/settings/${key}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({value: value.toString()})
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setMessage(t("user.settings.success"));
                
                // Determine the state key and parse the value
                const finalStateKey = stateKey ?? mapBackendKeyToStateKey(key);
                const parsedValue = isBooleanSetting(key) 
                    ? data.value === "true" 
                    : data.value;

                // Call the optional state update callback
                if (updateState) {
                    updateState(finalStateKey, parsedValue);
                }

                // Special handling for application language
                if (key === "application_language") {
                    changeLanguage(data.value);
                }

                // Call the optional callback after saving
                if (onSettingSaved) {
                    onSettingSaved(key, parsedValue, finalStateKey);
                }
            } else {
                setError(data.error || t("user.settings.error"));
            }
        } catch (err) {
            console.error(err);
            setError(t("user.settings.networkError"));
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        message,
        error,
        saveSetting,
        setLoading,
        setMessage,
        setError
    };
};

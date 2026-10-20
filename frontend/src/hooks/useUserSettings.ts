import {useState} from "react";
import {useTranslation} from "react-i18next";
import {changeLanguage} from "@/i18n/i18n";
import {isBooleanSetting, mapBackendKeyToStateKey, saveUserSetting} from "@/services/settingsApi";
import {apiErrorMessage} from "@/services/apiClient";

/** Callback volaný po úspěšném uložení nastavení. */
export type OnSettingSaved = (key: string, value: string | boolean, stateKey: string) => void;

/** Callback pro aktualizaci lokálního stavu po úspěšném uložení. */
export type UpdateStateCallback = (stateKey: string, parsedValue: string | boolean) => void;

/**
 * Custom hook for managing user settings with save functionality.
 * Provides a reusable way to save user settings to the backend.
 *
 * @param onSettingSaved - Optional callback function called after a setting is successfully saved
 */
export const useUserSettings = (onSettingSaved?: OnSettingSaved) => {
    const {t} = useTranslation();

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Saves a user setting to the backend
     *
     * @param key - The backend key for the setting (e.g., "application_language")
     * @param value - The value to save
     * @param updateState - Optional callback to update local state after successful save
     * @param stateKey - Optional state key override (defaults to mapped key from backend key)
     */
    const saveSetting = async (
        key: string,
        value: string | boolean,
        updateState?: UpdateStateCallback,
        stateKey?: string
    ): Promise<void> => {
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const savedValue = await saveUserSetting(key, value.toString());
            setMessage(t("user.settings.success"));

            // Determine the state key and parse the value
            const finalStateKey = stateKey ?? mapBackendKeyToStateKey(key);
            const parsedValue: string | boolean = isBooleanSetting(key)
                ? savedValue === "true"
                : savedValue;

            // Call the optional state update callback
            if (updateState) {
                updateState(finalStateKey, parsedValue);
            }

            // Special handling for application language
            if (key === "application_language") {
                changeLanguage(savedValue || "cs");
            }

            // Call the optional callback after saving
            if (onSettingSaved) {
                onSettingSaved(key, parsedValue, finalStateKey);
            }
        } catch (err) {
            console.error(err);
            setError(apiErrorMessage(err, t("user.settings.networkError")));
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

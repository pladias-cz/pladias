import {useState} from "react";
import {useTranslation} from "react-i18next";
import {changeLanguage} from "@/i18n/i18n";

/**
 * Mapping from backend key format (snake_case) to frontend state key format (camelCase)
 */
const BACKEND_TO_STATE_KEY_MAPPING: Record<string, string> = {
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
const isBooleanSetting = (backendKey: string): boolean => {
    return backendKey.includes("traits_substitute_percentasinteger") ||
        backendKey.includes("traits_substitute_english");
};

/**
 * Converts backend key (snake_case) to frontend state key (camelCase)
 * @param backendKey - The key from the backend
 * @returns The corresponding state key
 */
export const mapBackendKeyToStateKey = (backendKey: string): string => {
    return BACKEND_TO_STATE_KEY_MAPPING[backendKey] ?? backendKey;
};

/** Odpověď backendu na GET/PUT /api/react/user/settings/{key}. */
interface UserSettingResponse {
    success?: boolean;
    value?: string;
    error?: string;
}

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
            const response = await fetch(`/api/react/user/settings/${key}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({value: value.toString()})
            });

            const data: UserSettingResponse = await response.json();

            if (response.ok && data.success) {
                setMessage(t("user.settings.success"));

                // Determine the state key and parse the value
                const finalStateKey = stateKey ?? mapBackendKeyToStateKey(key);
                const parsedValue: string | boolean = isBooleanSetting(key)
                    ? data.value === "true"
                    : (data.value ?? "");

                // Call the optional state update callback
                if (updateState) {
                    updateState(finalStateKey, parsedValue);
                }

                // Special handling for application language
                if (key === "application_language") {
                    changeLanguage(data.value ?? "cs");
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

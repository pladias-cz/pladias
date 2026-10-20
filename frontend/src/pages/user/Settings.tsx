import {useEffect, useState} from "react";
import {Alert, Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import ResetSettings from "@/components/settings/ResetSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import TraitsSettings from "@/components/settings/TraitsSettings";
import {useUser} from "@/context/UserContext";
import {changeLanguage} from "@/i18n/i18n";
import {useUserSettings} from "@/hooks/useUserSettings";
import {getUserSetting, isBooleanSetting, mapBackendKeyToStateKey, resetUserSettings} from "@/services/settingsApi";
import {apiErrorMessage} from "@/services/apiClient";
import type {UserSettingsState} from "@/components/settings/types";

export default function Settings() {
    const {t} = useTranslation();
    usePageTitle(t("user.settings.title"));
    const {isTraitAdmin, language} = useUser();

    const [userSettings, setUserSettings] = useState<UserSettingsState>({
        applicationLanguage: language || "cs",
        traitsSubstituteFalse: "FALSE",
        traitsSubstituteTrue: "TRUE",
        traitsSubstituteNull: "NULL",
        traitsSubstituteUnmeasurable: "unmeasurable",
        traitsSubstitutePercentInteger: false,
        traitsSubstituteInEnglish: false
    });

    // Use the reusable user settings hook
    const {
        loading,
        message,
        error,
        saveSetting,
        setLoading,
        setMessage,
        setError
    } = useUserSettings((_key, value, stateKey) => {
        // Update local state after successful save
        setUserSettings(prev => ({
            ...prev,
            [stateKey]: value
        }));
    });

    // Load user settings on component mount
    useEffect(() => {
        loadUserSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- načtení jednou při mountu; loadUserSettings není memoizované, jeho závislost by smyčila render
    }, []);

    const loadUserSettings = async (): Promise<void> => {
        setLoading(true);
        try {
            // Initialize with default values
            const newSettings: UserSettingsState = {
                applicationLanguage: language || "cs",
                traitsSubstituteFalse: "",
                traitsSubstituteTrue: "",
                traitsSubstituteNull: "",
                traitsSubstituteUnmeasurable: "",
                traitsSubstitutePercentInteger: false,
                traitsSubstituteInEnglish: false
            };

            // Load application language setting
            const appLanguage = await getUserSetting("application_language");
            if (appLanguage !== null) {
                newSettings.applicationLanguage = appLanguage;
            }

            if (isTraitAdmin) {
                // zápis přes keyof union TS neumožňuje, použijeme Record pohled na stejný objekt
                const newSettingsRecord = newSettings as Record<string, string | boolean>;
                const settingsToLoad = [
                    "traits_substitute_false",
                    "traits_substitute_true",
                    "traits_substitute_null",
                    "traits_substitute_unmeasurable",
                    "traits_substitute_percentasinteger",
                    "traits_substitute_english"
                ];

                // Load all trait settings
                for (const key of settingsToLoad) {
                    const value = await getUserSetting(key);
                    if (value !== null) {
                        const stateKey = mapBackendKeyToStateKey(key) as keyof UserSettingsState;
                        newSettingsRecord[stateKey] = isBooleanSetting(key) ? value === "true" : value;
                    }
                }
            }

            // Update state with all loaded settings at once
            setUserSettings(newSettings);

            // Update i18n language if it was loaded
            if (newSettings.applicationLanguage) {
                changeLanguage(newSettings.applicationLanguage);
            }
        } catch (err) {
            console.error(err);
            setError(t("user.settings.networkError"));
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (key: string, value: string | boolean): void => {
        setUserSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveSetting = (key: string, value: string): void => {
        saveSetting(key, value, (stateKey, parsedValue) => {
            setUserSettings(prev => ({
                ...prev,
                [stateKey]: parsedValue
            }));
        });
    };

    const handleResetSettings = async (keyPrefix: string): Promise<void> => {
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            await resetUserSettings(keyPrefix);
            // Reload settings after reset
            await loadUserSettings();
            setMessage(t("user.settings.success"));
        } catch (err) {
            console.error(err);
            setError(apiErrorMessage(err, t("user.settings.networkError")));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Row>
            <Col xs={12} md={{span: 10, offset: 1}} lg={{span: 6, offset: 2}}>
                <h2>{t("user.settings.title")}</h2>

                {error && <Alert variant="danger">{error}</Alert>}
                {message && <Alert variant="success">{message}</Alert>}

                {/* Reset default settings section */}
                <ResetSettings
                    handleResetSettings={handleResetSettings}
                    loading={loading}
                />

                {/* Application language section */}
                <LanguageSettings
                    userSettings={userSettings}
                    handleInputChange={handleInputChange}
                    handleSaveSetting={handleSaveSetting}
                    loading={loading}
                />

                {/* Traits substitution section - only for trait admins */}
                {isTraitAdmin && (
                    <TraitsSettings
                        userSettings={userSettings}
                        handleInputChange={handleInputChange}
                        handleSaveSetting={handleSaveSetting}
                        loading={loading}
                    />
                )}
            </Col>
        </Row>
    );
}

import React, {useEffect, useState} from "react";
import {Alert, Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import ResetSettings from "@/components/settings/ResetSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import TraitsSettings from "@/components/settings/TraitsSettings";
import {useInstanceConfig} from "@/context/InstanceConfigContext";
import {useUser} from "@/context/UserContext.tsx";
import {changeLanguage} from "@/i18n/i18n";
import {useUserSettings, mapBackendKeyToStateKey} from "@/hooks/useUserSettings";

export default function Settings() {
    const {t} = useTranslation();
    usePageTitle(t("user.settings.title"));
    const {hasAtlasModule, hasBiblioModule, hasMeasurementsModule} = useInstanceConfig();
    const {isMapAdmin, isBulkEditor, isTraitAdmin, isSysAdmin, isTaxonAdmin, userEmail, language} = useUser();

    const [userSettings, setUserSettings] = useState({
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
    } = useUserSettings((key, value, stateKey) => {
        // Update local state after successful save
        setUserSettings(prev => ({
            ...prev,
            [stateKey]: value
        }));
    });

    // Load user settings on component mount
    useEffect(() => {
        loadUserSettings();
    }, []);

    const loadUserSettings = async () => {
        setLoading(true);
        try {
            // Initialize with default values
            const newSettings = {
                applicationLanguage: language || "cs",
                traitsSubstituteFalse: "",
                traitsSubstituteTrue: "",
                traitsSubstituteNull: "",
                traitsSubstituteUnmeasurable: "",
                traitsSubstitutePercentInteger: false,
                traitsSubstituteInEnglish: false
            };

            // Load application language setting
            const appLangResponse = await fetch("/api/react/user/settings/application_language");
            const appLangData = await appLangResponse.json();
            if (appLangResponse.ok && appLangData.success) {
                newSettings.applicationLanguage = appLangData.value;
            }

            if (isTraitAdmin) {
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
                    const response = await fetch(`/api/react/user/settings/${key}`);
                    const data = await response.json();
                    if (response.ok && data.success) {
                        const stateKey = mapBackendKeyToStateKey(key);
                        if (key.includes("traits_substitute_percentasinteger") || key.includes("traits_substitute_english")) {
                            newSettings[stateKey] = data.value === "true";
                        } else {
                            newSettings[stateKey] = data.value;
                        }
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

    const handleInputChange = (key, value) => {
        setUserSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveSetting = (key, value) => {
        saveSetting(key, value, (stateKey, parsedValue) => {
            setUserSettings(prev => ({
                ...prev,
                [stateKey]: parsedValue
            }));
        });
    };

    const handleResetSettings = async (keyPrefix) => {
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(`/api/react/user/settings/${keyPrefix}`, {
                method: "DELETE"
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Reload settings after reset
                await loadUserSettings();
                setMessage(t("user.settings.success"));
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

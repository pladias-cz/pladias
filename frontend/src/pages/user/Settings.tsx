import {useEffect, useState} from 'react';
import {Col, Row} from 'react-bootstrap';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';
import ResetSettings from '@/components/settings/ResetSettings';
import LanguageSettings from '@/components/settings/LanguageSettings';
import TraitsSettings from '@/components/settings/TraitsSettings';
import {useUser} from '@/context/UserContext';
import {changeLanguage} from '@/i18n/i18n';
import {useUserSettings} from '@/hooks/useUserSettings';
import {getUserSetting, isBooleanSetting, mapBackendKeyToStateKey, resetUserSettings} from '@/services/settingsApi';
import {notifyApiError, useNotifications} from '@/stores/notificationStore';
import type {UserSettingsState} from '@/components/settings/types';

/** Trait nastavení spravovaná trait adminem (backend klíče). */
const TRAIT_SETTING_KEYS = [
    'traits_substitute_false',
    'traits_substitute_true',
    'traits_substitute_null',
    'traits_substitute_unmeasurable',
    'traits_substitute_percentasinteger',
    'traits_substitute_english'
] as const;

/**
 * Načte všechna uživatelská nastavení do stavu formuláře.
 * Čistá funkce pro queryFn – bez vedlejších efektů na UI stav.
 */
async function fetchUserSettings(language: string, isTraitAdmin: boolean): Promise<UserSettingsState> {
    // Initialize with default values
    const settings: UserSettingsState = {
        applicationLanguage: language || 'cs',
        traitsSubstituteFalse: '',
        traitsSubstituteTrue: '',
        traitsSubstituteNull: '',
        traitsSubstituteUnmeasurable: '',
        traitsSubstitutePercentInteger: false,
        traitsSubstituteInEnglish: false
    };

    // Load application language setting
    const appLanguage = await getUserSetting('application_language');
    if (appLanguage !== null) {
        settings.applicationLanguage = appLanguage;
    }

    if (isTraitAdmin) {
        // zápis přes keyof union TS neumožňuje, použijeme Record pohled na stejný objekt
        const settingsRecord = settings as Record<string, string | boolean>;
        for (const key of TRAIT_SETTING_KEYS) {
            const value = await getUserSetting(key);
            if (value !== null) {
                const stateKey = mapBackendKeyToStateKey(key) as keyof UserSettingsState;
                settingsRecord[stateKey] = isBooleanSetting(key) ? value === 'true' : value;
            }
        }
    }

    return settings;
}

export default function Settings() {
    const {t} = useTranslation();
    usePageTitle(t('user.settings.title'));
    const {isTraitAdmin, language} = useUser();
    const queryClient = useQueryClient();

    const [userSettings, setUserSettings] = useState<UserSettingsState>({
        applicationLanguage: language || 'cs',
        traitsSubstituteFalse: 'FALSE',
        traitsSubstituteTrue: 'TRUE',
        traitsSubstituteNull: 'NULL',
        traitsSubstituteUnmeasurable: 'unmeasurable',
        traitsSubstitutePercentInteger: false,
        traitsSubstituteInEnglish: false
    });

    const {push} = useNotifications();

    // Use the reusable user settings hook (mutations stay imperative – sekce J).
    // Feedback akcí jde do globálních notifikací (Toast vpravo dole) – inline
    // Alert na začátku stránky není po scrollu vidět.
    const {
        loading: savingLoading,
        saveSetting
    } = useUserSettings((_key, value, stateKey) => {
        // Update local state after successful save
        setUserSettings(prev => ({
            ...prev,
            [stateKey]: value
        }));
        push({type: 'success', message: t('user.settings.success')});
    });

    // Load user settings on component mount (declarative, bez cache – sekce J)
    const {
        data: loadedSettings,
        isFetching: loadingSettings,
        error: settingsError,
    } = useQuery({
        queryKey: ['userSettings', isTraitAdmin],
        queryFn: () => fetchUserSettings(language || 'cs', isTraitAdmin),
    });

    useEffect(() => {
        if (loadedSettings) {
            setUserSettings(loadedSettings);
            // Update i18n language if it was loaded
            changeLanguage(loadedSettings.applicationLanguage);
        }
    }, [loadedSettings]);

    // Chyba načtení → globální notifikace (stejně jako feedback akcí, sekce F)
    useEffect(() => {
        if (settingsError) {
            notifyApiError(settingsError, t('user.settings.networkError'));
        }
    }, [settingsError, t]);

    // Formuláře jsou blokované při načítání i ukládání (jako dřív sdílený loading)
    const loading = loadingSettings || savingLoading;

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
        try {
            await resetUserSettings(keyPrefix);
            // Reload settings after reset – invalidace spustí refetch query
            await queryClient.invalidateQueries({queryKey: ['userSettings']});
            push({type: 'success', message: t('user.settings.success')});
        } catch (err) {
            notifyApiError(err, t('user.settings.networkError'));
        }
    };

    return (
        <Row>
            <Col xs={12} md={{span: 10, offset: 1}} lg={{span: 6, offset: 2}}>
                <h2>{t('user.settings.title')}</h2>

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

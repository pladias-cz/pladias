/**
 * Stav uživatelských nastavení spravovaný stránkou Settings.
 * Klíče jsou camelCase varianty backendových klíčů (mapování v `@/hooks/useUserSettings`).
 *
 * Type alias (nikoli interface) záměrně: díky implicitnímu index signatuře je
 * zapisovatelný přes `Record<string, string | boolean>` (načítání nastavení z backendu).
 */
export type UserSettingsState = {
    applicationLanguage: string;
    traitsSubstituteFalse: string;
    traitsSubstituteTrue: string;
    traitsSubstituteNull: string;
    traitsSubstituteUnmeasurable: string;
    traitsSubstitutePercentInteger: boolean;
    traitsSubstituteInEnglish: boolean;
};

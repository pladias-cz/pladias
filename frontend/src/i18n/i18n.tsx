import i18n from "i18next";
import {initReactI18next} from "react-i18next";

import cs from "../locales/cs/translation.json";
import en from "../locales/en/translation.json";
import pl from "../locales/pl/translation.json";

// Initialize i18n with default settings
i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {translation: en},
            cs: {translation: cs},
            pl: {translation: pl},
        },
        lng: "cs",           // default language
        fallbackLng: "cs",   // fallback
        interpolation: {
            escapeValue: false, // React already escapes
        },
    });

// Function to change language dynamically
export const changeLanguage = (language: string) => {
    return i18n.changeLanguage(language);
};

export default i18n;

import i18n from "i18next";
import {initReactI18next} from "react-i18next";

import cs from "../locales/cs/translation.json";
import en from "../locales/en/translation.json";
import pl from "../locales/pl/translation.json";

// Type-safe i18n klíče: cs je zdroj pravdy, překlep v t("...") neprojde `tsc -b`
// Dynamické klíče z backendu se přetypovávají na místě použití.
declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "translation";
        resources: { translation: typeof cs };
    }
}

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

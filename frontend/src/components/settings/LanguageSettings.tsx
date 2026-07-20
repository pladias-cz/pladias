import {Button, Form, Table} from "react-bootstrap";
import {useTranslation} from "react-i18next";

interface LanguageSettingsProps {
    userSettings: Record<string, string>;
    handleInputChange: (key: string, value: string) => void;
    handleSaveSetting: (key: string, value: string) => void;
    loading: boolean;
}

export default function LanguageSettings({userSettings, handleInputChange, handleSaveSetting, loading}: LanguageSettingsProps) {
    const {t, i18n} = useTranslation();

    const handleLanguageChange = (language: string) => {
        handleInputChange("applicationLanguage", language);
    };

    const handleSaveLanguage = () => {
        handleSaveSetting("application_language", userSettings.applicationLanguage);
        // Update the i18n language immediately
        i18n.changeLanguage(userSettings.applicationLanguage);
    };

    return (
        <div className="mb-4">
            <h4>{t("user.settings.applicationLanguage")}</h4>
            <p dangerouslySetInnerHTML={{__html: t("user.settings.languageDescription")}}/>

            <Table hover responsive className="align-middle">
                <tbody>
                <tr>
                    <td>{t("user.settings.applicationLanguage")}</td>
                    <td>
                        <Form.Check
                            type="radio"
                            id="optionsRadiosApplicationCz"
                            label={t("user.settings.languageCzech")}
                            name="applicationLanguage"
                            checked={userSettings.applicationLanguage === "cs"}
                            onChange={() => handleLanguageChange("cs")}
                            inline
                            className="me-3"
                        />
                        <Form.Check
                            type="radio"
                            id="optionsRadiosApplicationEn"
                            label={t("user.settings.languageEnglish")}
                            name="applicationLanguage"
                            checked={userSettings.applicationLanguage === "en"}
                            onChange={() => handleLanguageChange("en")}
                            inline
                            className="me-3"
                        />
                        <Form.Check
                            type="radio"
                            id="optionsRadiosApplicationPl"
                            label={t("user.settings.languagePolish")}
                            name="applicationLanguage"
                            checked={userSettings.applicationLanguage === "pl"}
                            onChange={() => handleLanguageChange("pl")}
                            inline
                            className="me-3"
                        />
                        <Button
                            variant="success"
                            onClick={handleSaveLanguage}
                            disabled={loading}
                        >
                            {t("user.settings.setButton")}
                        </Button>
                    </td>
                </tr>
                </tbody>
            </Table>
        </div>
    );
}

import {Button, Form, Table} from "react-bootstrap";
import {useTranslation} from "react-i18next";

interface TraitsSettingsProps {
    userSettings: Record<string, string | boolean>;
    handleInputChange: (key: string, value: string | boolean) => void;
    handleSaveSetting: (key: string, value: string) => void;
    loading: boolean;
}

export default function TraitsSettings({userSettings, handleInputChange, handleSaveSetting, loading}: TraitsSettingsProps) {
    const {t} = useTranslation();

    return (
        <div className="mb-4">
            <h4>{t("user.settings.traitsSubstitution")}</h4>
            <p dangerouslySetInnerHTML={{__html: t("user.settings.traitsDescription")}}/>

            <Table hover responsive className="align-middle">
                <tbody>
                <tr>
                    <td>FALSE</td>
                    <td>
                        <Form.Control
                            type="text"
                            value={userSettings.traitsSubstituteFalse as string}
                            onChange={(e) => handleInputChange("traitsSubstituteFalse", e.target.value)}
                            className="d-inline-block w-auto me-2"
                        /></td>
                    <td>
                        <Button
                            variant="success"
                            onClick={() => handleSaveSetting("traits_substitute_false", userSettings.traitsSubstituteFalse as string)}
                            disabled={loading}
                        >
                            {t("user.settings.setButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>TRUE</td>
                    <td>
                        <Form.Control
                            type="text"
                            value={userSettings.traitsSubstituteTrue as string}
                            onChange={(e) => handleInputChange("traitsSubstituteTrue", e.target.value)}
                            className="d-inline-block w-auto me-2"
                        /></td>
                    <td>
                        <Button
                            variant="success"
                            onClick={() => handleSaveSetting("traits_substitute_true", userSettings.traitsSubstituteTrue as string)}
                            disabled={loading}
                        >
                            {t("user.settings.setButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>NULL</td>
                    <td>
                        <Form.Control
                            type="text"
                            value={userSettings.traitsSubstituteNull as string}
                            onChange={(e) => handleInputChange("traitsSubstituteNull", e.target.value)}
                            className="d-inline-block w-auto me-2"
                        /></td>
                    <td>
                        <Button
                            variant="success"
                            onClick={() => handleSaveSetting("traits_substitute_null", userSettings.traitsSubstituteNull as string)}
                            disabled={loading}
                        >
                            {t("user.settings.setButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>unmeasurable</td>
                    <td>
                        <Form.Control
                            type="text"
                            value={userSettings.traitsSubstituteUnmeasurable as string}
                            onChange={(e) => handleInputChange("traitsSubstituteUnmeasurable", e.target.value)}
                            className="d-inline-block w-auto me-2"
                        /></td>
                    <td>
                        <Button
                            variant="success"
                            onClick={() => handleSaveSetting("traits_substitute_unmeasurable", userSettings.traitsSubstituteUnmeasurable as string)}
                            disabled={loading}
                        >
                            {t("user.settings.setButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>{t("user.settings.traitsPercentage")}</td>
                    <td>
                        <Form.Check
                            type="radio"
                            id="optionsRadiosInteger"
                            label={t("user.settings.traitsPercentageInteger")}
                            name="traitsSubstitutePercentInteger"
                            checked={userSettings.traitsSubstitutePercentInteger as boolean}
                            onChange={() => handleInputChange("traitsSubstitutePercentInteger", true)}
                            className="mb-2"
                        />
                        <Form.Check
                            type="radio"
                            id="optionsRadiosProportion"
                            label={t("user.settings.traitsPercentageProportion")}
                            name="traitsSubstitutePercentInteger"
                            checked={!(userSettings.traitsSubstitutePercentInteger as boolean)}
                            onChange={() => handleInputChange("traitsSubstitutePercentInteger", false)}
                            className="mb-2"
                        /></td>
                    <td>
                        <Button
                            variant="success"
                            onClick={() => handleSaveSetting("traits_substitute_percentasinteger", userSettings.traitsSubstitutePercentInteger.toString())}
                            disabled={loading}
                        >
                            {t("user.settings.setButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>{t("user.settings.traitsLanguage")}</td>
                    <td>
                        <Form.Check
                            type="radio"
                            id="optionsRadiosCz"
                            label={t("user.settings.traitsLanguageCzech")}
                            name="traitsSubstituteInEnglish"
                            checked={!userSettings.traitsSubstituteInEnglish}
                            onChange={() => handleInputChange("traitsSubstituteInEnglish", false)}
                            className="mb-2"
                        />
                        <Form.Check
                            type="radio"
                            id="optionsRadiosEn"
                            label={t("user.settings.traitsLanguageEnglish")}
                            name="traitsSubstituteInEnglish"
                            checked={userSettings.traitsSubstituteInEnglish as boolean}
                            onChange={() => handleInputChange("traitsSubstituteInEnglish", true)}
                            className="mb-2"
                        /></td>
                    <td>
                        <Button
                            variant="success"
                            onClick={() => handleSaveSetting("traits_substitute_english", userSettings.traitsSubstituteInEnglish.toString())}
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

import {Button, Table} from "react-bootstrap";
import {useTranslation} from "react-i18next";

interface ResetSettingsProps {
    handleResetSettings: (key: string) => void;
    loading: boolean;
}

export default function ResetSettings({handleResetSettings, loading}: ResetSettingsProps) {
    const {t} = useTranslation();

    return (
        <div className="mb-4">
            <h4>{t("user.settings.resetDefaults")}</h4>
            <p>{t("user.settings.resetDescription")}</p>

            <Table hover responsive className="align-middle">
                <tbody>
                <tr>
                    <td>
                        <label>{t("user.settings.resetAtlasLayers")}</label>
                    </td>
                    <td>
                        <Button
                            variant="primary"
                            onClick={() => handleResetSettings("atlas_layers")}
                            disabled={loading}
                        >
                            {t("user.settings.resetButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>{t("user.settings.resetAtlasSearch")}</label>
                    </td>
                    <td>
                        <Button
                            variant="primary"
                            onClick={() => handleResetSettings("atlas_search")}
                            disabled={loading}
                        >
                            {t("user.settings.resetButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>{t("user.settings.resetPanel")}</label>
                    </td>
                    <td>
                        <Button
                            variant="primary"
                            onClick={() => handleResetSettings("panel")}
                            disabled={loading}
                        >
                            {t("user.settings.resetButton")}
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>{t("user.settings.resetTraits")}</label>
                    </td>
                    <td>
                        <Button
                            variant="primary"
                            onClick={() => handleResetSettings("traits")}
                            disabled={loading}
                        >
                            {t("user.settings.resetButton")}
                        </Button>
                    </td>
                </tr>
                </tbody>
            </Table>
        </div>
    );
}

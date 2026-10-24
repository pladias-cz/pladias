import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function UploadFile() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.admin.uploadFile.title"));
    return (
        <Row>
            <h3>{t("atlas.admin.uploadFile.title")}</h3>
        </Row>
    );
}

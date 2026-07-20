
import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function Preslia() {
    const {t} = useTranslation();
    usePageTitle(t("pages.atlasAdmin.preslia.title"));
    return (
        <Row>
            <h3>{t("pages.atlasAdmin.preslia.title")}</h3>
        </Row>
    );
}

import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function ListOfTaxaSubtree() {
    const {t} = useTranslation();
    usePageTitle(t("pages.atlasAdmin.listOfTaxaSubtree.title"));
    return (
        <Row>
            <h3>{t("pages.atlasAdmin.listOfTaxaSubtree.title")}</h3>
        </Row>
    );
}
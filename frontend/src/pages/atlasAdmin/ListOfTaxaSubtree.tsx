
import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function ListOfTaxaSubtree() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.admin.listOfTaxaSubtree.title"));
    return (
        <Row>
            <h3>{t("atlas.admin.listOfTaxaSubtree.title")}</h3>
        </Row>
    );
}
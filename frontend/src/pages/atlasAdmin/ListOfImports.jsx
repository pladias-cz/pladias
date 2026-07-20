
import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import ImportsList from "@/components/atlasAdmin/ImportsList";

export default function ListOfImports() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.admin.pages.listOfImports.title"));
    return (
        <Row>
            <h3>{t("atlas.admin.pages.listOfImports.title")}</h3>
            <ImportsList />
        </Row>
    );
}
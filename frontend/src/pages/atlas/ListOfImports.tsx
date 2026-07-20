import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import ListOfImports from "@/components/atlas/listOfImports/ListOfImports";

export default function ListOfImportsPage() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.importsList.title"));
    return (
        <Row>
            <h3 className="mb-3">{t("atlas.importsList.title")}</h3>
            <ListOfImports />
        </Row>
    );
}
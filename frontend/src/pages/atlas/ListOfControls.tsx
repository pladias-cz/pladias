import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import ListOfControls from "@/components/atlas/listOfControls/ListOfControls";

export default function ListOfControlsPage() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.controls.title"));
    return (
        <Row>
            <h3 className="mb-3">{t("atlas.controls.title")}</h3>
            <ListOfControls />
        </Row>
    );
}
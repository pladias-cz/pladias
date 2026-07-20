import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import TaxaList from "@/components/atlasAdmin/TaxaList";

export default function ListOfTaxa() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.admin.pages.listOfTaxa.title"));
    return (
        <Row>
            <TaxaList />
        </Row>
    );
}
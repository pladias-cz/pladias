import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import TaxaList from "@/components/atlas/TaxaList.tsx";

export default function ListOfTaxa() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.taxesList.title"));
    return (
        <Row>
            <TaxaList />
        </Row>
    );
}
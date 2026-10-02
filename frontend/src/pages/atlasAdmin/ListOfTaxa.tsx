import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import TaxaList from "@/components/atlasAdmin/TaxaList";

export default function ListOfTaxa() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.admin.pages.listOfTaxa.title"));
    return (
        <Row>
            <div className="mb-2">
                <a
                    href="/api/react/atlas/map-reports/taxa-in-publication-process-csv"
                    className="text-decoration-none"
                >
                    <i className="bi bi-file-earmark-spreadsheet text-success me-1"></i>
                    {t("atlas.admin.pages.listOfTaxa.downloadPublicationCsv")}
                </a>
            </div>
            <TaxaList />
        </Row>
    );
}
import {Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import ExportTraitList from "@/components/measurement/export/ExportTraitList.tsx";
import ExportTaxaList from "@/components/measurement/export/ExportTaxaList.tsx";
import ExportOptions from "@/components/measurement/export/ExportOptions.tsx";

export default function Export() {
    const {t} = useTranslation();
    usePageTitle(t("trait.export.title"));
    return (
        <form method="post" action="/traits/exportResult" className="form-horizontal">
            <h3>{t("trait.export.title")}</h3>
            <Row>
                <Col>
                    <ExportTraitList></ExportTraitList>
                </Col>
                <Col>
                    <ExportTaxaList></ExportTaxaList>
                </Col>
                <Col>
                    <ExportOptions></ExportOptions>
                </Col>
            </Row>
        </form>
    );
}
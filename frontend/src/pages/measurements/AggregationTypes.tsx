import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import AggregationTable from "@/components/measurement/AggregationTable.tsx";

export default function AggregationTypes() {
    const {t} = useTranslation();
    usePageTitle(t("trait.aggregationTypes.title"));
    return (
        <>
            <Row>
                <h3>{t("trait.aggregationTypes.heading")}</h3>
                <p dangerouslySetInnerHTML={{__html: t("trait.aggregationTypes.paragraph1")}} />
                <p>{t("trait.aggregationTypes.paragraph2")}</p>
                <p>{t("trait.aggregationTypes.paragraph3")}</p>
            </Row>
            <AggregationTable></AggregationTable>
        </>
    );
}
import {Row} from "react-bootstrap";
import 'bootstrap-icons/font/bootstrap-icons.css';
import {useTranslation} from "react-i18next";


import {usePageTitle} from "@/hooks/usePageTitle";
import DatatypesTable from "@/components/measurement/DatatypesTable.tsx";

export default function Datatypes() {
    const {t} = useTranslation();
    usePageTitle(t("trait.datatypes.title"));
    return (
        <>
        <Row>
            <h3>{t("trait.datatypes.title")}</h3>
            <p>{t("trait.datatypes.text1")} <a href="mailto:mar.reznickova@@seznam.cz"
                                                            title="poslat email"><i className="bi bi-envelope fs-4 text-primary"></i>
                </a>.
            </p>

            <hr/>

            <p>{t("trait.datatypes.text2")}</p>

        </Row>
        <DatatypesTable></DatatypesTable>
        </>
    );
}

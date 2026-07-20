import {Row} from "react-bootstrap";
// @ts-ignore
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
            <p>Zakládání nových vlastností druhů, datových typů a změny v číselnících výčtových typů se provádějí ručně.
                Tyto procesy vyřizuje Marcela Řezníčková <a href="mailto:mar.reznickova@@seznam.cz"
                                                            title="poslat email"><i className="bi bi-envelope fs-4 text-primary"></i>
                </a>.
            </p>

            <hr/>

            <p>Aktuální přehled dostupných datových typů, jejich popis a omezení prezentuje následující tabulka. </p>

        </Row>
        <DatatypesTable></DatatypesTable>
        </>
    );
}
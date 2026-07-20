import {Col, Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import BackupForm from "@/components/measurement/backup/BackupForm.tsx";
import BackupTable from "@/components/measurement/backup/BackupTable.tsx";

export default function Backup() {
    const {t} = useTranslation();
    usePageTitle(t("trait.backup.title"));
    return (
        <>
            <Row>
                <h3>{t("trait.backup.title")}</h3>
            </Row>
            <Row>
                <BackupForm></BackupForm>
            </Row>
            <Row className={"mt-5"}>
                <Col className={"col-6 offset-3"}>
                    <BackupTable></BackupTable>
                </Col>
            </Row>
        </>
    );
}
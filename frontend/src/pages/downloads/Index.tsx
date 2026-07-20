import {Row} from "react-bootstrap";
import {useTranslation} from "react-i18next";

import {usePageTitle} from "@/hooks/usePageTitle";
import DownloadsTable from "@/components/downloads/DownloadsTable.tsx";

export default function Index() {
    const {t} = useTranslation();
    usePageTitle(t("other.pages.downloads.title"));
    return (
        <Row>
            <DownloadsTable></DownloadsTable>
        </Row>
    );
}
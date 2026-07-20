
import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import {PlayMessage} from "@/components/settings"

export default function Home() {
    const {t} = useTranslation();
    usePageTitle(t("other.pages.home.title"));
    return (
        <Row>
            <PlayMessage messageKey="main_page_texts"><></></PlayMessage>
        </Row>
    );
}

import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import SearchForm from "@/components/atlas/search/SearchForm";

export default function Search() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.search.title"));
    
    return (
        <Row>
            <h3 className="mb-3">{t("atlas.search.title")}</h3>
            <SearchForm />
            <div className="w-100 pb-5" />
        </Row>
    );
}
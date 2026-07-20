import React from "react";
import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";

export default function Docs() {
    const {t} = useTranslation();
    usePageTitle(t("other.pages.user.title"));
    return (
        <Row>
            <h3>{t("other.pages.user.title")}</h3>
        </Row>
    );
}
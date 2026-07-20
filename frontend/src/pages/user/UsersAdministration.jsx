// UsersAdministration.jsx
import React from "react";
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import UsersTable from "@/components/user/UsersTable";

export default function UsersAdministration() {
    const {t} = useTranslation();
    usePageTitle(t("user.usersAdministration.title"));

    return (
        <UsersTable />
    );
}
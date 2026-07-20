
import {usePageTitle} from "@/hooks/usePageTitle";
import {useTranslation} from "react-i18next";
import MapUsers from "@/components/atlasAdmin/MapUsers";

export default function ListOfUsers() {
    const {t} = useTranslation();
    usePageTitle(t("atlas.admin.pages.listOfUsers.title"));
    return <MapUsers />;
}
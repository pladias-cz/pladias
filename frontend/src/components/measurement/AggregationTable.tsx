import {useEffect, useState} from "react";
import {Table, Spinner} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type {TraitAggregationType} from "@/models/TraitAggregationType";
import {getTraitAggregationTypes} from "@/services/traitApi";
import RichTextMessage from "@/components/RichTextMessage";
import {notifyApiError} from "@/stores/notificationStore";

export default function AggregationTable() {
    const {t} = useTranslation();

    const [types, setTypes] = useState<TraitAggregationType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setTypes(await getTraitAggregationTypes());
            } catch (e) {
                notifyApiError(e, t("common.loadFailed"));
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [t]);

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner animation="border"/>
            </div>
        );
    }

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t("trait.aggregationTypes.key")}</th>
                <th>{t("trait.aggregationTypes.description")}</th>
            </tr>
            </thead>
            <tbody>
            {types.map((tpe) => (
                <tr key={tpe.key}>
                    <td>
                        <code>{tpe.key}</code>
                    </td>

                    <td><RichTextMessage html={tpe.description}/></td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

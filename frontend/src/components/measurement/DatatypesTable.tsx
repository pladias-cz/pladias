import { useEffect, useState } from "react";
import { Table, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import type { TraitDatatype } from "@/models/TraitDatatype";
import {getTraitDatatypes} from "@/services/traitApi";
import {notifyApiError} from "@/stores/notificationStore";

export default function DatatypesTable() {
    const { t } = useTranslation();

    const [datatypes, setDatatypes] = useState<TraitDatatype[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setDatatypes(await getTraitDatatypes());
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
                <Spinner animation="border" />
            </div>
        );
    }

    const boolIcon = (value: boolean) =>
        value ? (
            <i className="bi bi-check-lg text-success" aria-label="true" />
        ) : (
            <i className="bi bi-x-lg text-danger" aria-label="false" />
        );

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t("trait.datatypes.name")}</th>
                <th>{t("trait.datatypes.nameCz")}</th>
                <th>{t("trait.datatypes.description")}</th>
                <th>{t("trait.datatypes.multiplicity")}</th>
                <th>{t("trait.datatypes.dominance")}</th>
                <th>{t("trait.datatypes.frequency")}</th>
                <th>{t("trait.datatypes.comment")}</th>
                <th>{t("trait.datatypes.immeasurability")}</th>
            </tr>
            </thead>
            <tbody>
            {datatypes.map((d) => (
                <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.nameCz}</td>
                    <td>{d.description ?? "—"}</td>
                    <td className="text-center">{boolIcon(d.multiplicity)}</td>
                    <td className="text-center">{boolIcon(d.dominance)}</td>
                    <td className="text-center">{boolIcon(d.frequency)}</td>
                    <td className="text-center">{boolIcon(d.comment)}</td>
                    <td className="text-center">{boolIcon(d.immeasurability)}</td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

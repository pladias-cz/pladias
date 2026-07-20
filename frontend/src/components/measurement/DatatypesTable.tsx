import { useEffect, useState } from "react";
import { Table, Spinner, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
// import 'bootstrap-icons/font/bootstrap-icons.css';
import type { TraitDatatype } from "@/models/TraitDatatype.ts";

export default function DatatypesTable() {
    const { t } = useTranslation();

    const [datatypes, setDatatypes] = useState<TraitDatatype[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/react/measurement/datatypes");

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const result = await res.json();
                const data: TraitDatatype[] = result.data;

                setDatatypes(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner animation="border" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="my-3">
                {t("traitDatatypes.error")}: {error}
            </Alert>
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
                <th>{t("measurement.traitDatatypes.name")}</th>
                <th>{t("measurement.traitDatatypes.nameCz")}</th>
                <th>{t("measurement.traitDatatypes.description")}</th>
                <th>{t("measurement.traitDatatypes.multiplicity")}</th>
                <th>{t("measurement.traitDatatypes.dominance")}</th>
                <th>{t("measurement.traitDatatypes.frequency")}</th>
                <th>{t("measurement.traitDatatypes.comment")}</th>
                <th>{t("measurement.traitDatatypes.immeasurability")}</th>
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

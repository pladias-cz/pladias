import { useEffect, useState } from "react";
import { Table, Spinner, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import type { TraitAggregationType } from "@/models/TraitAggregationType.ts";

export default function AggregationTable() {
    const { t } = useTranslation();

    const [types, setTypes] = useState<TraitAggregationType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/react/measurement/aggregation-types");

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const result = await res.json();
                const data: TraitAggregationType[] = result.data;

                setTypes(data);
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
                {t("traitAggregation.error")}: {error}
            </Alert>
        );
    }

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t("measurement.traitAggregation.key")}</th>
                <th>{t("measurement.traitAggregation.description")}</th>
            </tr>
            </thead>
            <tbody>
            {types.map((tpe) => (
                <tr key={tpe.key}>
                    <td>
                        <code>{tpe.key}</code>
                    </td>

                    <td dangerouslySetInnerHTML={{__html: tpe.description ?? ""}}></td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

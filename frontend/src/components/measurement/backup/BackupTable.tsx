import { useEffect, useState } from "react";
import { Table, Spinner, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import type { TraitBackup } from "@/models/TraitBackup.ts";

export default function BackupTable() {
    const { t } = useTranslation();

    const [backups, setBackups] = useState<TraitBackup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/react/measurement/backups");

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const result = await res.json();
                setBackups(result.data);
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
                {t("traitBackups.error")}: {error}
            </Alert>
        );
    }

    const formatDate = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleString("cs-CZ") : "—";

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t("measurement.traitBackups.description")}</th>
                <th>{t("measurement.traitBackups.createdAt")}</th>
                <th className="text-center">
                    {t("measurement.traitBackups.download")}
                </th>
            </tr>
            </thead>
            <tbody>
            {backups.map((b) => (
                <tr key={b.id}>
                    <td>{b.description ?? "—"}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td className="text-center">
                        <a
                            href={`/traits/snapshot/${b.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary"
                        >
                            {t("measurement.traitBackups.download")}
                        </a>
                    </td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

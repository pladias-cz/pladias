import {useEffect, useState} from "react";
import {Table, Spinner} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import type {TraitBackup} from "@/models/TraitBackup";
import {getTraitBackups} from "@/services/traitApi";
import {notifyApiError} from "@/stores/notificationStore";

export default function BackupTable() {
    const {t} = useTranslation();

    const [backups, setBackups] = useState<TraitBackup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                setBackups(await getTraitBackups());
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

    const formatDate = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleString("cs-CZ") : "—";

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t("trait.backup.description")}</th>
                <th>{t("trait.backup.createdAt")}</th>
                <th className="text-center">
                    {t("trait.backup.download")}
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
                            href={`/api/react/measurement/backup/${b.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary"
                        >
                            {t("trait.backup.download")}
                        </a>
                    </td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

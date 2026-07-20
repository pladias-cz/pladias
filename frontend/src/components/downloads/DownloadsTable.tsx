import { useEffect, useState } from "react";
import { Table, Spinner, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import type {DownloadDto} from "@/models/Download.ts";

export default function DownloadsTable() {
    const { t } = useTranslation();

    const [downloads, setDownloads] = useState<DownloadDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/react/downloads");

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                const result = await res.json();
                const data: DownloadDto[] = result.data;
                setDownloads(data);
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
                {t("downloads.error")}: {error}
            </Alert>
        );
    }

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t("download.description")}</th>
                <th>{t("download.manager")}</th>
                <th>{t("download.version")}</th>
                <th>{t("download.download")}</th>
            </tr>
            </thead>
            <tbody>
            {downloads.map((d, i) => (
                <tr key={i}>
                    <td>{d.description}</td>
                    <td>{d.manager}</td>
                    <td>{d.version}</td>
                    <td>
                        <a href={d.url} target="_blank" rel="noopener noreferrer">
                            {t("download.download")}
                        </a>
                    </td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

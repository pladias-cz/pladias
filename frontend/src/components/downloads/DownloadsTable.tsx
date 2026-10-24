import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Table, Spinner, Alert, Button} from "react-bootstrap";
import {downloadDynamicFile, getDownloads} from "@/services/downloadApi";
import {downloadBlob} from "@/core/dataTable/export";
import {notifyApiError} from "@/stores/notificationStore";
import type {DownloadDto} from "@/models/Download";

export default function DownloadsTable() {
    const {t} = useTranslation();

    const [downloads, setDownloads] = useState<DownloadDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    /** indexy právě stahovaných dynamických exportů; blokuje se jen kliknuté tlačítko (proti dvojkliku), exporty můžou běžet souběžně */
    const [downloading, setDownloading] = useState<Set<number>>(new Set());

    useEffect(() => {
        const load = async () => {
            try {
                setDownloads(await getDownloads());
            } catch (e) {
                setError(e instanceof Error ? e.message : t("common.unknownError"));
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [t]);

    /**
     * Dynamický export (xlsx) – na rozdíl od statických odkazů jde o fetch přes
     * apiClient, aby chybu HTTP 500/401 šlo zobrazit Toast notifikací místo
     * uložení JSON/HTML jako souboru.
     */
    const handleDynamicDownload = async (download: DownloadDto, index: number) => {
        setDownloading((prev) => new Set(prev).add(index));
        try {
            const file = await downloadDynamicFile(download);
            downloadBlob(file.blob, file.filename);
        } catch (e) {
            notifyApiError(e, t("download.downloadFailed"));
        } finally {
            setDownloading((prev) => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner animation="border"/>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="my-3">
                {t("common.error")}: {error}
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
                        {d.dynamic ? (
                            <Button
                                variant="link"
                                className="p-0"
                                disabled={downloading.has(i)}
                                onClick={() => handleDynamicDownload(d, i)}
                            >
                                {downloading.has(i) ? (
                                    <>
                                        <Spinner as="span" size="sm" animation="border" className="me-1"/>
                                        {t("download.download")}
                                    </>
                                ) : (
                                    t("download.download")
                                )}
                            </Button>
                        ) : (
                            <a href={d.url} target="_blank" rel="noopener noreferrer">
                                {t("download.download")}
                            </a>
                        )}
                    </td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

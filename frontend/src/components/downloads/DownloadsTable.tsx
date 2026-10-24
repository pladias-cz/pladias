import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Table, Spinner, Button} from 'react-bootstrap';
import {useQuery} from '@tanstack/react-query';
import {downloadDynamicFile, getDownloads} from '@/services/downloadApi';
import {downloadBlob} from '@/core/dataTable/export';
import {notifyApiError} from '@/stores/notificationStore';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';
import type {DownloadDto} from '@/models/Download';

export default function DownloadsTable() {
    const {t} = useTranslation();

    // soubory ke stažení – bez cache (sekce J), při mountu znovu; chyba loadu
    // jde do toastu (notifyApiError), tabulka zůstane prázdná
    const {data: downloads = [], isPending: loading, error} = useQuery({
        queryKey: ['downloads'],
        queryFn: getDownloads,
    });
    useQueryErrorNotify(error, t('download.loadFailed'));

    /** indexy právě stahovaných dynamických exportů; blokuje se jen kliknuté tlačítko (proti dvojkliku), exporty můžou běžet souběžně */
    const [downloading, setDownloading] = useState<Set<number>>(new Set());

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
            notifyApiError(e, t('download.downloadFailed'));
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

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t('download.description')}</th>
                <th>{t('download.manager')}</th>
                <th>{t('download.version')}</th>
                <th>{t('download.download')}</th>
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
                                        {t('download.download')}
                                    </>
                                ) : (
                                    t('download.download')
                                )}
                            </Button>
                        ) : (
                            <a href={d.url} target="_blank" rel="noopener noreferrer">
                                {t('download.download')}
                            </a>
                        )}
                    </td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

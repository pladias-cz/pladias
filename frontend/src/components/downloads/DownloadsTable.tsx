import {Table, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {downloadDynamicFile, getDownloads} from '@/services/downloadApi';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';
import FileDownloadLink from '@/components/FileDownloadLink';

export default function DownloadsTable() {
    const {t} = useTranslation();

    // soubory ke stažení – bez cache (sekce J), při mountu znovu; chyba loadu
    // jde do toastu, tabulka zůstane prázdná
    const {data: downloads = [], isPending: loading, error} = useQuery({
        queryKey: ['downloads'],
        queryFn: getDownloads,
    });
    useQueryErrorNotify(error, t('download.loadFailed'));

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
                            <FileDownloadLink fetchFile={() => downloadDynamicFile(d)}>
                                {t('download.download')}
                            </FileDownloadLink>
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

import {Table, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {getTraitBackups} from '@/services/traitApi';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';

export default function BackupTable() {
    const {t} = useTranslation();

    // dostupné zálohy – bez cache (sekce J), při mountu znovu; chyba jde do toastu
    const {data: backups = [], isPending: loading, error} = useQuery({
        queryKey: ['traitBackups'],
        queryFn: getTraitBackups,
    });
    useQueryErrorNotify(error, t('common.loadFailed'));

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner animation="border"/>
            </div>
        );
    }

    const formatDate = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleString('cs-CZ') : '—';

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t('trait.backup.description')}</th>
                <th>{t('trait.backup.createdAt')}</th>
                <th className="text-center">
                    {t('trait.backup.download')}
                </th>
            </tr>
            </thead>
            <tbody>
            {backups.map((b) => (
                <tr key={b.id}>
                    <td>{b.description ?? '—'}</td>
                    <td>{formatDate(b.createdAt)}</td>
                    <td className="text-center">
                        <a
                            href={`/api/react/measurement/backup/${b.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-primary"
                        >
                            {t('trait.backup.download')}
                        </a>
                    </td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}

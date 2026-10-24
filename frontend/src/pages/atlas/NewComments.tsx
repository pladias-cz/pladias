import {Row} from 'react-bootstrap';
import {useQuery} from '@tanstack/react-query';
import {usePageTitle} from '@/hooks/usePageTitle';
import {useTranslation} from 'react-i18next';
import {PladiasRecordsTable} from '@/components/atlas/mapDetail/PladiasRecordsTable';
import type {RecordPladias} from '@/models';
import {getRecordsWithComments} from '@/services/atlasApi';
import {apiErrorMessage} from '@/services/apiClient';

export default function NewComments() {
    const {t} = useTranslation();
    usePageTitle(t('atlas.newComments.title'));

    // záznamy s komentáři uživatele – bez cache (sekce J), při mountu znovu
    const {data, isPending, error} = useQuery({
        queryKey: ['recordsWithComments'],
        queryFn: getRecordsWithComments,
    });
    const records: RecordPladias[] = data ?? [];
    const loadError = error ? apiErrorMessage(error, t('atlas.newComments.loadFailed')) : null;

    return (
        <Row className="g-3">
            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="mb-0">{t('atlas.newComments.title')}</h3>
                    {!isPending && !loadError && records.length > 0 && (
                        <small
                            className="text-muted">{t('atlas.newComments.recordsCount', {count: records.length})}</small>
                    )}
                </div>
                {isPending && <span className="text-muted">{t('common.loading')}</span>}
            </div>

            {loadError && <div className="text-danger">{loadError}</div>}

            {!isPending && !loadError && records.length === 0 && (
                <div className="text-muted">{t('atlas.newComments.noRecords')}</div>
            )}

            {records.length > 0 &&
                <PladiasRecordsTable records={records} showTaxonName={true} showExpandAllButton={true}/>}
        </Row>
    );
}

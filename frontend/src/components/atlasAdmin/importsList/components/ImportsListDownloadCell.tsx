import {useTranslation} from 'react-i18next';
import FileDownloadLink from '@/components/FileDownloadLink';
import {downloadBatchModified} from '@/services/mapAdminApi';
import type {ImportRecord} from '../types';

interface ImportsListDownloadCellProps {
    row: ImportRecord;
}

export function ImportsListDownloadCell({row}: ImportsListDownloadCellProps) {
    const {t} = useTranslation();

    return (
        <FileDownloadLink fetchFile={() => downloadBatchModified(row.batchId)}>
            {t('atlas.admin.importsList.downloadModified')}
        </FileDownloadLink>
    );
}

import {useTranslation} from 'react-i18next';
import type {ImportRecord} from '../types';

interface ImportsListDownloadCellProps {
    row: ImportRecord;
}

export function ImportsListDownloadCell({row}: ImportsListDownloadCellProps) {
    const {t} = useTranslation();
    
    return (
        <a 
            href={`/api/react/atlasadmin/downloadBatchModified/${row.batchId}`} 
            target="_blank" 
            rel="noopener noreferrer"
        >
            {t("atlas.admin.importsList.downloadModified")}
        </a>
    );
}

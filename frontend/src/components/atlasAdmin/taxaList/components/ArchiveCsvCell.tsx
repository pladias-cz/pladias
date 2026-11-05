import {useTranslation} from 'react-i18next';
import type {TaxonMapSettings} from '@/models/TaxonMapSettings';
import FileDownloadLink from '@/components/FileDownloadLink';
import {
    downloadArchiveCsv,
    downloadArchiveCsvMap,
    downloadPngMap
} from '@/services/mapAdminApi';
import {PngUploadButton} from './PngUploadButton';

interface ArchiveCsvCellProps {
    row: TaxonMapSettings;
    onPngUploadComplete: (taxonId: number, hasPng: boolean) => void;
}

const PNG_UPLOAD_ELIGIBLE_STATUSES = [2, 3];

export function ArchiveCsvCell({row, onPngUploadComplete}: ArchiveCsvCellProps) {
    const {t} = useTranslation();
    const {
        csvMapDetailId,
        csvMapDetailTimestamp,
        taxonId,
        isMapped,
        publicationStatusId,
        hasPng
    } = row;

    const canUploadPng = isMapped && PNG_UPLOAD_ELIGIBLE_STATUSES.includes(publicationStatusId);

    if (!csvMapDetailId) {
        return (
            <div className="d-flex flex-column gap-1">
                <span className="text-muted">{t('atlas.admin.taxaList.noCsv')}</span>
                {canUploadPng && (
                    <PngUploadButton taxonId={taxonId} onUploadComplete={onPngUploadComplete}/>
                )}
            </div>
        );
    }

    const formatDate = (ts: number): string => {
        if (!ts) return '';
        return new Date(ts).toISOString().slice(0, 10);
    };

    return (
        <div className="d-flex flex-column gap-1">
            <small className="text-muted">
                {csvMapDetailTimestamp ? formatDate(csvMapDetailTimestamp) : ''}
            </small>
            <div className="d-flex flex-column gap-1">
                <small>
                    <FileDownloadLink
                        fetchFile={() => downloadArchiveCsv(csvMapDetailId)}
                        title={t('atlas.admin.taxaList.downloadCsv')}
                        className="p-0 text-decoration-none"
                    >
                        <i className="bi bi-file-earmark-spreadsheet text-success me-1"></i>
                        CSV
                    </FileDownloadLink>
                    <br/>
                    <FileDownloadLink
                        fetchFile={() => downloadArchiveCsvMap(csvMapDetailId)}
                        title={t('atlas.admin.taxaList.downloadCsvMap')}
                        className="p-0 text-decoration-none"
                    >
                        <i className="bi bi-map text-primary me-1"></i>
                        CSV MAP
                    </FileDownloadLink>
                    {hasPng && (
                        <>
                            <hr className="my-1"/>
                            <FileDownloadLink
                                fetchFile={() => downloadPngMap(taxonId)}
                                title={t('atlas.admin.taxaList.downloadPngMap')}
                                className="p-0 text-decoration-none"
                            >
                                <i className="bi bi-image text-secondary me-1"></i>
                                PNG
                            </FileDownloadLink>
                        </>
                    )}
                </small>
                {canUploadPng && (
                    <PngUploadButton taxonId={taxonId} onUploadComplete={onPngUploadComplete}/>
                )}
            </div>
        </div>
    );
}

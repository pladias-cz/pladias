import {useTranslation} from 'react-i18next';
import type {TaxonMapSettings} from '@/models/TaxonMapSettings';
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
                    <a
                        href={`/api/react/atlas/map-reports/download-csv/${csvMapDetailId}`}
                        title={t('atlas.admin.taxaList.downloadCsv')}
                        className="text-decoration-none"
                    >
                        <i className="bi bi-file-earmark-spreadsheet text-success me-1"></i>
                        CSV
                    </a>
                    <br/>
                    <a
                        href={`/api/react/atlas/map-reports/download-csv-map/${csvMapDetailId}`}
                        title={t('atlas.admin.taxaList.downloadCsvMap')}
                        className="text-decoration-none"
                    >
                        <i className="bi bi-map text-primary me-1"></i>
                        CSV MAP
                    </a>
                    {hasPng && (
                        <>
                            <hr className="my-1"/>
                            <a
                                href={`/api/react/atlas/pngMap/taxon/${taxonId}`}
                                title={t('atlas.admin.taxaList.downloadPngMap')}
                                className="text-decoration-none"
                            >
                                <i className="bi bi-image text-secondary me-1"></i>
                                PNG
                            </a>
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

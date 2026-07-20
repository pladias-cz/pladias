import {Button, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {ImportRecord} from '../types';

interface ImportsListDeleteCellProps {
    row: ImportRecord;
    onDelete: (batchId: number) => void;
    deletingBatchId: number | null;
}

export function ImportsListDeleteCell({row, onDelete, deletingBatchId}: ImportsListDeleteCellProps) {
    const {t} = useTranslation();
    
    if (row.hasDeletionCode) {
        return <span className="text-muted">{t("atlas.admin.importsList.markedForDeletion")}</span>;
    }
    
    const isDeleting = deletingBatchId === row.batchId;
    
    return (
        <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(row.batchId)}
            disabled={isDeleting}
        >
            {isDeleting ? (
                <><Spinner animation="border" size="sm" className="me-1" />{t("common.loading")}</>
            ) : (
                t("atlas.admin.importsList.delete")
            )}
        </Button>
    );
}

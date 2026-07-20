import {Button, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {ImportControlRecord} from '../types';

interface ImportControlsDeleteCellProps {
    row: ImportControlRecord;
    onDelete: (id: number) => void;
    isDeleting?: boolean;
}

export function ImportControlsDeleteCell({row, onDelete, isDeleting}: ImportControlsDeleteCellProps) {
    const {t} = useTranslation();
    
    return (
        <Button
            variant="outline-danger"
            size="sm"
            onClick={() => onDelete(row.id)}
            disabled={isDeleting}
        >
            {isDeleting ? (
                <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    {t("common.loading")}
                </>
            ) : (
                t("atlas.admin.importsList.delete")
            )}
        </Button>
    );
}

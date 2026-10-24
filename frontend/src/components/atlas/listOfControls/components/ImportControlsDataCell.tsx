import {Badge} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {ImportControlRecord} from '../types';

interface ImportControlsDataCellProps {
    row: ImportControlRecord;
}

export function ImportControlsDataCell({row}: ImportControlsDataCellProps) {
    const {t} = useTranslation();

    const badges = [];
    if (row.warningsCount > 0) {
        badges.push(
            <Badge key="warnings" bg="warning" text="dark" className="me-1">
                {t("atlas.admin.importsList.warnings")} {row.warningsCount}
            </Badge>
        );
    }
    if (row.errorsCount > 0) {
        badges.push(
            <Badge key="errors" bg="danger" className="me-1">
                {t("atlas.admin.importsList.error")} {row.errorsCount}
            </Badge>
        );
    }
    if (row.infosCount > 0) {
        badges.push(
            <Badge key="infos" bg="info" className="me-1">
                {t("atlas.admin.importsList.infos")} {row.infosCount}
            </Badge>
        );
    }

    return (
        <div className="d-flex align-items-center gap-2">
            <span className="fw-bold">{row.recordsCount}</span>
            <span className="text-muted">{t("atlas.admin.importsList.records")}</span>
            {badges.length > 0 ? <>{badges}</> : <span>{t("atlas.admin.importsList.ok")}</span>}
        </div>
    );
}

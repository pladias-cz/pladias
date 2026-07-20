import {Badge} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {ImportRecord} from '../types';

interface ImportsListDataCellProps {
    row: ImportRecord;
}

export function ImportsListDataCell({row}: ImportsListDataCellProps) {
    const {t} = useTranslation();
    
    const badges = [];
    if (row.warningsCount > 0) {
        badges.push(
            <Badge key="warnings" bg="warning" text="dark" className="me-1">
                {t("atlas.admin.importsList.warnings")} {row.warningsCount}
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

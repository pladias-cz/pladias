/**
 * XLSX export buttons of a server-side DataTable
 */

import {Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useExcelExport, type ExcelExportVariant} from './useExcelExport.ts';

interface ExcelExportButtonsProps {
    endpoint: string;
    sorting: Array<{id: string; desc: boolean}>;
    columnFilters: Array<{id: string; value: string}>;
    additionalParams?: Record<string, string>;
}

export function ExcelExportButtons({
    endpoint,
    sorting,
    columnFilters,
    additionalParams,
}: ExcelExportButtonsProps) {
    const {t} = useTranslation();
    const {exporting, error, exportExcel} = useExcelExport({
        endpoint,
        sorting,
        columnFilters,
        additionalParams,
        errorMessage: t("common.table.exportFailed"),
    });

    const button = (variant: ExcelExportVariant, label: string) => (
        <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={exporting !== null}
            onClick={() => exportExcel(variant)}
        >
            {exporting === variant && <Spinner animation="border" size="sm" className="me-1" />}
            {label}
        </button>
    );

    return (
        <div className="d-flex align-items-center gap-2 flex-wrap">
            {button('all', t("common.table.excelAll"))}
            {button('filtered', t("common.table.excelFiltered"))}
            {error && <span className="text-danger small">{error}</span>}
        </div>
    );
}

export default ExcelExportButtons;

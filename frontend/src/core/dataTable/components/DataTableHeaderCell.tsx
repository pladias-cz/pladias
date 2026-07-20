/**
 * Sortable header cell component for DataTable
 */

import {useTranslation} from 'react-i18next';

interface DataTableHeaderCellProps {
    label: string;
    columnId: string;
    sortIndicator: 'asc' | 'desc' | null;
    canSort: boolean;
    onSort: (columnId: string) => void;
    width?: string | number;
    minWidth?: string | number;
}

export function DataTableHeaderCell(props: DataTableHeaderCellProps) {
    const {label, columnId, sortIndicator, canSort, onSort, width, minWidth} = props;
    const {t} = useTranslation();

    const handleSortClick = () => {
        if (canSort) {
            onSort(columnId);
        }
    };

    const getSortTitle = (): string => {
        if (!canSort) return '';
        switch (sortIndicator) {
            case 'asc':
                return t("common.table.sort.ascending");
            case 'desc':
                return t("common.table.sort.descending");
            default:
                return t("common.table.sort.clickToSort");
        }
    };

    const getSortIcon = (): string => {
        switch (sortIndicator) {
            case 'asc':
                return ' 🔼';
            case 'desc':
                return ' 🔽';
            default:
                return '';
        }
    };

    return (
        <th
            onClick={handleSortClick}
            style={{
                width,
                minWidth,
                maxWidth: width,
                cursor: canSort ? 'pointer' : 'default',
            }}
            className={canSort ? 'cursor-pointer select-none' : ''}
            title={getSortTitle()}
        >
            {label}{getSortIcon()}
        </th>
    );
}

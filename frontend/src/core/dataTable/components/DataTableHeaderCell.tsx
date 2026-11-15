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
    /**
     * Fixní rozvržení tabulky (`tableLayout: 'stable'`). Při `false` (auto) se
     * `width`/upřesnění `maxWidth` nepoužijí – pevná šířka by popřela přizpůsobení
     * obsahu viditelných buněk. `minWidth` zůstává i při auto jako ochrana proti
     * kolapsu sloupce.
     */
    fixedLayout?: boolean;
    /** Tooltip pro neřaditelnou hlavičku (řaditelná si ho odvodí ze stavu řazení). */
    title?: string;
}

export function DataTableHeaderCell(props: DataTableHeaderCellProps) {
    const {label, columnId, sortIndicator, canSort, onSort, width, minWidth, fixedLayout = true, title} = props;
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
                return t('common.table.sort.ascending');
            case 'desc':
                return t('common.table.sort.descending');
            default:
                return t('common.table.sort.clickToSort');
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
                width: fixedLayout ? width : undefined,
                minWidth,
                maxWidth: fixedLayout ? width : undefined,
                cursor: canSort ? 'pointer' : 'default',
            }}
            className={canSort ? 'cursor-pointer select-none' : ''}
            title={canSort ? getSortTitle() : title}
        >
            {label}{getSortIcon()}
        </th>
    );
}

/**
 * Filter row component for DataTable
 * Renders appropriate filter inputs based on column type
 */

import {Form} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import type {DataTableColumnDef} from '../types';
import {canFilter, getFilterPlaceholder} from '../utils';
import {DateRangeFilter} from './DateRangeFilter';
import {DataTableFilterCell} from './DataTableFilterCell';

interface DataTableFilterRowProps<T> {
    columns: DataTableColumnDef<T>[];
    filters: Array<{ id: string; value: string }>;
    onFilterChange: (columnId: string, value: string) => void;
    /** Fixní rozvržení tabulky – při auto se pevná width/maxWidth nepoužijí
     * (stejná dohoda jako DataTableHeaderCell.fixedLayout). */
    fixedLayout?: boolean;
}

export function DataTableFilterRow<T>(props: DataTableFilterRowProps<T>) {
    const {columns, filters, onFilterChange, fixedLayout = true} = props;
    const {t} = useTranslation();

    const getFilterValue = (columnId: string): string => {
        const filter = filters.find(f => f.id === columnId);
        return filter?.value ?? '';
    };

    // Helper to get date range filter values from additionalParams-style storage
    // Filters are stored as {id}:from and {id}:to
    const getFromDateValue = (columnId: string): string => {
        const filter = filters.find(f => f.id === `${columnId}:from`);
        return filter?.value ?? '';
    };

    const getToDateValue = (columnId: string): string => {
        const filter = filters.find(f => f.id === `${columnId}:to`);
        return filter?.value ?? '';
    };

    const handleFromDateChange = (columnId: string, value: string) => {
        onFilterChange(`${columnId}:from`, value);
    };

    const handleToDateChange = (columnId: string, value: string) => {
        onFilterChange(`${columnId}:to`, value);
    };

    return (
        <tr>
            {columns.map((column) => (
                <th
                    key={`filter-${String(column.id)}`}
                    style={{
                        width: fixedLayout ? column.width : undefined,
                        minWidth: column.minWidth,
                        maxWidth: fixedLayout ? column.width : undefined,
                    }}
                >
                    {canFilter(column) ? (
                        column.type === 'boolean' || column.type === 'checkbox' ? (
                            <Form.Select
                                size="sm"
                                value={getFilterValue(String(column.id))}
                                onChange={(e) => onFilterChange(String(column.id), e.target.value)}
                                style={{width: '100%'}}
                            >
                                <option value="">{t('common.table.filter.all')}</option>
                                <option value="true">{t('common.table.filter.yes')}</option>
                                <option value="false">{t('common.table.filter.no')}</option>
                            </Form.Select>
                        ) : column.type === 'text' && column.filterOptions ? (
                            <Form.Select
                                size="sm"
                                value={getFilterValue(String(column.id))}
                                onChange={(e) => onFilterChange(String(column.id), e.target.value)}
                                style={{width: '100%'}}
                            >
                                <option value="">{t('common.table.filter.all')}</option>
                                {column.filterOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </Form.Select>
                        ) : column.type === 'action' && column.filterControl === 'options' ? (
                            // relační sloupce (typ 'action' s enableFiltering):
                            // wildcard input s nápovědou přednačtených hodnot –
                            // projekty/taxony; filtr posílá volný text, placeholder
                            // má vlastní text filtru, ne výchozí „Vše“
                            <DataTableFilterCell
                                control="typeahead"
                                value={getFilterValue(String(column.id))}
                                onChange={(value) => onFilterChange(String(column.id), value)}
                                placeholder={column.filterPlaceholder}
                                title={column.filterPlaceholder}
                                options={column.filterOptions ?? []}
                            />
                        ) : column.type === 'number' ? (
                            <Form.Control
                                size="sm"
                                type="number"
                                placeholder={getFilterPlaceholder(column, t)}
                                value={getFilterValue(String(column.id))}
                                onChange={(e) => onFilterChange(String(column.id), e.target.value)}
                                style={{width: '100%', boxSizing: 'border-box'}}
                            />
                        ) : column.type === 'timestamp' && column.enableRangeFilter !== false ? (
                            <DateRangeFilter
                                fromDate={getFromDateValue(String(column.id))}
                                toDate={getToDateValue(String(column.id))}
                                onFromDateChange={(value) => handleFromDateChange(String(column.id), value)}
                                onToDateChange={(value) => handleToDateChange(String(column.id), value)}
                            />
                        ) : column.type === 'date' ? (
                            <Form.Control
                                size="sm"
                                type="text"
                                placeholder={getFilterPlaceholder(column, t)}
                                value={getFilterValue(String(column.id))}
                                onChange={(e) => onFilterChange(String(column.id), e.target.value)}
                                style={{width: '100%', boxSizing: 'border-box'}}
                            />
                        ) : (
                            <Form.Control
                                size="sm"
                                type="text"
                                placeholder={getFilterPlaceholder(column, t)}
                                value={getFilterValue(String(column.id))}
                                onChange={(e) => onFilterChange(String(column.id), e.target.value)}
                                style={{width: '100%', boxSizing: 'border-box'}}
                            />
                        )
                    ) : null}
                </th>
            ))}
        </tr>
    );
}

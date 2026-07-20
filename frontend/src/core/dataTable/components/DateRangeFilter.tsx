/**
 * Date range filter component for timestamp columns
 * Provides from/to date inputs for filtering timestamp data
 */

import {Form} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';

interface DateRangeFilterProps {
    fromDate: string;
    toDate: string;
    onFromDateChange: (value: string) => void;
    onToDateChange: (value: string) => void;
}

export function DateRangeFilter({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange
}: DateRangeFilterProps) {
    const {t} = useTranslation();

    return (
        <div className="d-flex gap-2">
            <Form.Control
                size="sm"
                type="date"
                placeholder={t("common.table.filter.dateFrom")}
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                style={{width: '50%'}}
            />
            <Form.Control
                size="sm"
                type="date"
                placeholder={t("common.table.filter.dateTo")}
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                style={{width: '50%'}}
            />
        </div>
    );
}

export default DateRangeFilter;

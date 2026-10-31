/**
 * Row count display component for DataTable
 */

import {Badge} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';

interface DataRowCountProps {
    fromIndex: number;
    toIndex: number;
    total: number;
    loading?: boolean;
}

/** Mezera jako oddělovač tisíců („4 280") – stejný formát jako číselné sloupce tabulky (DataTable). */
const numberFormat = new Intl.NumberFormat('cs');

export function DataRowCount(props: DataRowCountProps) {
    const {fromIndex, toIndex, total, loading} = props;
    const {t} = useTranslation();

    if (loading) {
        return (
            <p className="mb-0">
                <Badge bg="secondary">{t('common.loading')}</Badge>
            </p>
        );
    }

    const text = t('common.table.showing', {
        from: numberFormat.format(fromIndex),
        to: numberFormat.format(toIndex),
        total: numberFormat.format(total),
    });

    return <p className="mb-0">{text}</p>;
}
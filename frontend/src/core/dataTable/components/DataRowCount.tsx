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

export function DataRowCount(props: DataRowCountProps) {
    const {fromIndex, toIndex, total, loading} = props;
    const {t} = useTranslation();

    if (loading) {
        return (
            <p className="mb-0">
                <Badge bg="secondary">{t("common.loading")}</Badge>
            </p>
        );
    }

    const text = t("common.table.showing", {
        from: fromIndex,
        to: toIndex,
        total,
    });

    return <p className="mb-0">{text}</p>;
}
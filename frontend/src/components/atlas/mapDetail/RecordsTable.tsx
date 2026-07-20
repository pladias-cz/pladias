import { Table } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import type { RecordGbifMinimal } from '@/pages/atlas/MapDetail';
import './RecordsTable.scss';

interface RecordsTableProps {
    records: RecordGbifMinimal[];
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
}

export function RecordsTable({ records, highlightedRecordId, onRecordHover }: RecordsTableProps) {
    const { t } = useTranslation();

    if (records.length === 0) {
        return null;
    }

    return (
        <div className="table-responsive records-table-container">
            <Table striped bordered hover size="sm" className="mb-0">
                <thead>
                    <tr>
                        <th>{t("atlas.mapDetail.recordId")}</th>
                        <th>{t("atlas.mapDetail.year")}</th>
                        <th>{t("atlas.mapDetail.latitude")}</th>
                        <th>{t("atlas.mapDetail.longitude")}</th>
                        <th>{t("atlas.mapDetail.collectors")}</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => {
                        const isHighlighted = highlightedRecordId === record.id;
                        return (
                            <tr 
                                key={record.id}
                                className={isHighlighted ? 'table-active' : ''}
                                onMouseEnter={() => onRecordHover?.(record.id)}
                                onMouseLeave={() => onRecordHover?.(null)}
                            >
                                <td style={{ backgroundColor: record.validationStatusColor || '#808080' }}>
                                    <a href={`https://www.gbif.org/occurrence/${record.id}`} target="_blank" rel="noopener noreferrer">
                                        {record.id}
                                    </a>
                                </td>
                                <td>
                                    {record.year || t("atlas.mapDetail.unknownYear")}
                                </td>
                                <td className="text-nowrap">
                                    {record.latitude.toFixed(4)}
                                </td>
                                <td className="text-nowrap">
                                    {record.longitude.toFixed(4)}
                                </td>
                                <td>
                                    {record.recordedBy || '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
}

export default RecordsTable;

import {Table} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useRef, useEffect} from 'react';
import type {RecordGbifMinimal} from '@/pages/atlas/MapDetail';
import './RecordsTable.scss';

interface ExternalRecordsTableProps {
    records: RecordGbifMinimal[];
    highlightedRecordId?: number | null;
    onRecordHover?: (recordId: number | null) => void;
    tableName?: string;
    registerScrollFn?: (scrollFn: (recordId: number) => void) => void;
}

export function ExternalRecordsTable({
                                         records,
                                         highlightedRecordId,
                                         onRecordHover,
                                         registerScrollFn
                                     }: ExternalRecordsTableProps) {
    const {t} = useTranslation();
    const rowRefs = useRef<{ [key: number]: HTMLTableRowElement | null }>({});

    if (records.length === 0) {
        return null;
    }

    // Register scroll function for map hover to use
    useEffect(() => {
        if (registerScrollFn) {
            const scrollFn = (recordId: number) => {
                if (rowRefs.current[recordId]) {
                    rowRefs.current[recordId]?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }
            };
            registerScrollFn(scrollFn);
        }
    }, [registerScrollFn]);

    return (
        <Table striped bordered hover size="sm">
            <thead>
            <tr>
                <th>{t("atlas.mapDetail.recordId")}</th>
                <th>{t("atlas.mapDetail.source")}</th>
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
                        ref={(el) => {
                            rowRefs.current[record.id] = el;
                        }}
                        className={`${isHighlighted ? 'table-active highlight-row' : ''}`}
                        onMouseEnter={() => onRecordHover?.(record.id)}
                        onMouseLeave={() => onRecordHover?.(null)}
                    >
                        <td style={{backgroundColor: record.validationStatusColor || '#808080'}}>
                            <a href={`https://www.gbif.org/occurrence/search?entity=o_${record.id}`} target="_blank"
                               rel="noopener noreferrer">
                                {record.id}
                            </a>
                        </td>
                        <td>
                            <span className="text-uppercase fw-semibold">{record.project}</span>
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
    );
}

export default ExternalRecordsTable;

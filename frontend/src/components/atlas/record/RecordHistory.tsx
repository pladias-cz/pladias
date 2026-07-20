import {Row, Col, Card} from "react-bootstrap";
import {useTranslation} from "react-i18next";
import {DataTable} from "@/core/dataTable";
import type { RecordHistoryEntry } from '@/models/RecordHistory';

interface RecordHistoryProps {
    recordId: number;
}

export default function RecordHistory({recordId}: RecordHistoryProps) {
    const {t} = useTranslation();

    const columns: Array<{
        id: string;
        header: string;
        type: 'text' | 'timestamp';
        accessor: keyof RecordHistoryEntry;
        enableSorting: boolean;
        enableFiltering: boolean;
        width: string;
        cellRenderer?: (value: any) => React.ReactNode;
        dateFormat?: string;
    }> = [
        {
            id: "userName",
            header: t("record.commentAuthor"),
            type: "text",
            accessor: "userName",
            enableSorting: true,
            enableFiltering: true,
            width: "20%",
        },
        {
            id: "fieldDesc",
            header: t("record.historyField"),
            type: "text",
            accessor: "fieldDesc",
            enableSorting: true,
            enableFiltering: true,
            width: "20%",
        },
        {
            id: "changeType",
            header: t("record.changeType"),
            type: "text",
            accessor: "changeType",
            enableSorting: true,
            enableFiltering: true,
            width: "15%",
            cellRenderer: (value: string) => {
                if (!value) return "-";
                return value;
            },
        },
        {
            id: "oldValue",
            header: t("record.historyOldValue"),
            type: "text",
            accessor: "oldValue",
            enableSorting: false,
            enableFiltering: true,
            width: "20%",
        },
        {
            id: "newValue",
            header: t("record.historyNewValue"),
            type: "text",
            accessor: "newValue",
            enableSorting: false,
            enableFiltering: true,
            width: "20%",
        },
        {
            id: "createTimestamp",
            header: t("record.commentDate"),
            type: "timestamp",
            accessor: "createTimestamp",
            dateFormat: "dd.MM.yyyy HH:mm",
            enableSorting: true,
            enableFiltering: false,
            width: "15%",
        },
    ];

    return (
        <Row className="mb-3">
            <Col>
                <Card>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                        <strong>
                            {t("record.history")}
                        </strong>
                    </Card.Header>
                    <Card.Body>
                        <DataTable<RecordHistoryEntry>
                            endpoint={`/api/react/atlas/record/history/${recordId}`}
                            columns={columns}
                            initialPageSize={10}
                            pageSizeOptions={[10, 20]}
                            showPagination={true}
                            method="GET"
                        />
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}

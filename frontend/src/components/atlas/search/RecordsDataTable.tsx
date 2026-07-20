import {useMemo} from "react";
import {Card} from "react-bootstrap";
import {Link} from "react-router-dom";
import {DataTable} from "@/core/dataTable";
import {createTextColumn, createNumberColumn} from "@/core/dataTable";

/**
 * Interface for floristic record data from backend
 */
interface FloraRecord {
    id: number;
    name: string;
    // Add more fields as needed from backend
}

interface RecordsDataTableProps {
    searchQuery?: string;
    additionalParams?: Record<string, string>;
}

/**
 * Data table component for displaying atlas records
 * Fetches data from backend with pagination, sorting, and filtering support
 * 
 * Can be used:
 * - With search form (pass searchQuery)
 * - With predefined filters (pass additionalParams)
 * - With both combined
 */
export default function RecordsDataTable({searchQuery, additionalParams: externalParams}: RecordsDataTableProps) {
    // Column definitions
    const columns = useMemo(() => [
        createNumberColumn<FloraRecord>('id', 'ID', {
            enableSorting: true,
            enableFiltering: false,
            width: '80px',
        }),
        createTextColumn<FloraRecord>('name', 'Název rostliny', {
            enableSorting: true,
            enableFiltering: true,
            cellRenderer: (value, row) => (
                <Link to={`/atlas/record/${row.id}`} className="text-decoration-none">
                    {value}
                </Link>
            ),
        }),
    ], []);

    // Additional params passed to backend - includes search query + external params
    const additionalParams: Record<string, string> | undefined = useMemo(() => {
        const params: Record<string, string> = {};
        
        // Add search query if present
        if (searchQuery && searchQuery.trim()) {
            params.searchQuery = searchQuery.trim();
        }
        
        // Add external params (overwrites searchQuery if there's a conflict)
        if (externalParams) {
            Object.assign(params, externalParams);
        }
        
        return Object.keys(params).length > 0 ? params : undefined;
    }, [searchQuery, externalParams]);

    return (
        <Card>
            <Card.Body>
                <DataTable<FloraRecord>
                    endpoint="/api/react/atlas/records"
                    columns={columns}
                    initialPageSize={10}
                    pageSizeOptions={[10, 20, 50]}
                    additionalParams={additionalParams}
                />
            </Card.Body>
        </Card>
    );
}
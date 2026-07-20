import {Badge} from 'react-bootstrap';
import type {ImportRecord} from '../types';

interface ImportsWarningsCellProps {
    row: ImportRecord;
}

export function ImportsWarningsCell({row}: ImportsWarningsCellProps) {
    if (row.warningsCount > 0) {
        return (
            <Badge bg="warning" text="dark">
                {row.warningsCount}
            </Badge>
        );
    }
    return <span className="text-muted">-</span>;
}

import {Badge} from 'react-bootstrap';
import type {ImportControlRecord} from '../types';

interface ImportControlsWarningsCellProps {
    row: ImportControlRecord;
}

export function ImportControlsWarningsCell({row}: ImportControlsWarningsCellProps) {
    if (row.warningsCount > 0) {
        return (
            <Badge bg="warning" text="dark">
                {row.warningsCount}
            </Badge>
        );
    }
    return <span className="text-muted">-</span>;
}

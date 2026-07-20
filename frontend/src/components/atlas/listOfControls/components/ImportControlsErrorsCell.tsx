import {Badge} from 'react-bootstrap';
import type {ImportControlRecord} from '../types';

interface ImportControlsErrorsCellProps {
    row: ImportControlRecord;
}

export function ImportControlsErrorsCell({row}: ImportControlsErrorsCellProps) {
    if (row.errorsCount > 0) {
        return (
            <Badge bg="danger">
                {row.errorsCount}
            </Badge>
        );
    }
    return <span className="text-muted">-</span>;
}

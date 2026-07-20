import type {ImportRecord} from '../types';

interface ImportsIdCellProps {
    row: ImportRecord;
}

export function ImportsIdCell({row}: ImportsIdCellProps) {
    return (
        <span className="text-muted">#{row.id}</span>
    );
}

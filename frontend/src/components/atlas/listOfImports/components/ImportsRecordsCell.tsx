import type {ImportRecord} from '../types';

interface ImportsRecordsCellProps {
    row: ImportRecord;
}

export function ImportsRecordsCell({row}: ImportsRecordsCellProps) {
    return (
        <span className="fw-bold">{row.recordsCount}</span>
    );
}

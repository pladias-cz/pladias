import type {ImportControlRecord} from '../types';

interface ImportControlsRecordsCellProps {
    row: ImportControlRecord;
}

export function ImportControlsRecordsCell({row}: ImportControlsRecordsCellProps) {
    return (
        <span className="fw-bold">{row.recordsCount}</span>
    );
}

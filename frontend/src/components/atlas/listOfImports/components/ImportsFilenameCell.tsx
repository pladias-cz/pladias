import type {ImportRecord} from '../types';

interface ImportsFilenameCellProps {
    row: ImportRecord;
}

export function ImportsFilenameCell({row}: ImportsFilenameCellProps) {
    if (!row.filename) return <span>-</span>;
    
    return (
        <a 
            href={`/api/react/occurrence/imports/${row.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
        >
            {row.filename}
        </a>
    );
}

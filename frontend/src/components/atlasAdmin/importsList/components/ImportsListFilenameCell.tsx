import type {ImportRecord} from '../types';

interface ImportsListFilenameCellProps {
    row: ImportRecord;
}

export function ImportsListFilenameCell({row}: ImportsListFilenameCellProps) {
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

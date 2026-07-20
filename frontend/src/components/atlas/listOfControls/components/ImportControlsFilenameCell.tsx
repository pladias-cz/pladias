import type {ImportControlRecord} from '../types';

interface ImportControlsFilenameCellProps {
    row: ImportControlRecord;
}

export function ImportControlsFilenameCell({row}: ImportControlsFilenameCellProps) {
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
